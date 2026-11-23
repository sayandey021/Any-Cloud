use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;
use crate::platform::apply_platform_process_flags;
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone)]
pub struct ProcessOutput {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

pub struct ProcessManager {
    binary_path: PathBuf,
}

impl ProcessManager {
    pub fn new(binary_path: PathBuf) -> Self {
        Self { binary_path }
    }

    /// Prepares a tokio Command with platform flags (e.g. CREATE_NO_WINDOW on Windows)
    /// and standard I/O pipes.
    fn prepare_command(&self, args: &[String]) -> Command {
        let mut cmd = Command::new(&self.binary_path);
        apply_platform_process_flags(&mut cmd);
        cmd.args(args);
        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        cmd.kill_on_drop(true); // Prevents zombie processes if caller cancels or drops future
        cmd
    }

    /// Executes an Rclone command asynchronously and captures full stdout and stderr.
    pub async fn execute(&self, args: &[String]) -> RcloneResult<ProcessOutput> {
        if !self.binary_path.exists() && self.binary_path != Path::new("rclone") && self.binary_path != Path::new("rclone.exe") {
            return Err(RcloneError::BinaryNotFound(
                self.binary_path.to_string_lossy().to_string(),
            ));
        }

        let mut cmd = self.prepare_command(args);
        let child = cmd.spawn().map_err(|err| {
            if err.kind() == std::io::ErrorKind::NotFound {
                RcloneError::BinaryNotFound(self.binary_path.to_string_lossy().to_string())
            } else {
                RcloneError::IoError(format!("Failed to spawn rclone: {}", err))
            }
        })?;

        let output = child.wait_with_output().await.map_err(|err| {
            RcloneError::IoError(format!("Failed to wait for rclone process: {}", err))
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code();

        if !output.status.success() {
            return Err(RcloneError::ProcessFailed {
                code: exit_code,
                stderr: stderr.trim().to_string(),
            });
        }

        Ok(ProcessOutput {
            exit_code,
            stdout,
            stderr,
        })
    }

    /// Executes with cancellation support via oneshot channel
    pub async fn execute_with_cancellation(
        &self,
        args: &[String],
        mut cancel_rx: oneshot::Receiver<()>,
    ) -> RcloneResult<ProcessOutput> {
        let mut cmd = self.prepare_command(args);
        let mut child = cmd.spawn().map_err(|err| {
            RcloneError::IoError(format!("Failed to spawn rclone: {}", err))
        })?;

        tokio::select! {
            _ = &mut cancel_rx => {
                let _ = child.kill().await;
                Err(RcloneError::TransferCancelled)
            }
            res = child.wait() => {
                let status = res.map_err(|err| RcloneError::IoError(err.to_string()))?;
                let mut stdout_buf = Vec::new();
                let mut stderr_buf = Vec::new();
                if let Some(mut stdout) = child.stdout.take() {
                    let _ = stdout.read_to_end(&mut stdout_buf).await;
                }
                if let Some(mut stderr) = child.stderr.take() {
                    let _ = stderr.read_to_end(&mut stderr_buf).await;
                }
                let stdout = String::from_utf8_lossy(&stdout_buf).to_string();
                let stderr = String::from_utf8_lossy(&stderr_buf).to_string();
                let exit_code = status.code();

                if !status.success() {
                    return Err(RcloneError::ProcessFailed {
                        code: exit_code,
                        stderr: stderr.trim().to_string(),
                    });
                }

                Ok(ProcessOutput {
                    exit_code,
                    stdout,
                    stderr,
                })
            }
        }
    }

    /// Spawns a streaming process that feeds stderr lines (where rclone prints progress and stats)
    /// to a callback function in real time.
    pub async fn stream_process<F>(
        &self,
        args: &[String],
        mut on_stderr_line: F,
        mut cancel_rx: oneshot::Receiver<()>,
    ) -> RcloneResult<()>
    where
        F: FnMut(&str) + Send + 'static,
    {
        let mut cmd = self.prepare_command(args);
        let mut child = cmd.spawn().map_err(|err| {
            RcloneError::IoError(format!("Failed to spawn rclone for streaming: {}", err))
        })?;

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| RcloneError::Internal("Failed to capture stderr pipe".into()))?;

        let mut reader = BufReader::new(stderr).lines();

        loop {
            tokio::select! {
                _ = &mut cancel_rx => {
                    let _ = child.kill().await;
                    return Err(RcloneError::TransferCancelled);
                }
                line = reader.next_line() => {
                    match line {
                        Ok(Some(text)) => {
                            on_stderr_line(&text);
                        }
                        Ok(None) => break,
                        Err(e) => {
                            log::warn!("Error reading rclone stderr stream: {}", e);
                            break;
                        }
                    }
                }
            }
        }

        let status = child
            .wait()
            .await
            .map_err(|e| RcloneError::IoError(e.to_string()))?;

        if !status.success() {
            return Err(RcloneError::ProcessFailed {
                code: status.code(),
                stderr: "Streaming process exited with error status".to_string(),
            });
        }

        Ok(())
    }
}
