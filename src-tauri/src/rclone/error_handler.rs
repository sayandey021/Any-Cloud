use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
pub enum RcloneError {
    #[error("Rclone executable not found. Checked system PATH, application directory, and custom locations. Please install Rclone or configure its path in settings: {0}")]
    BinaryNotFound(String),

    #[error("Rclone configuration file error: {0}")]
    ConfigError(String),

    #[error("Process execution failed with exit code {code:?}: {stderr}")]
    ProcessFailed {
        code: Option<i32>,
        stderr: String,
    },

    #[error("Failed to parse Rclone output: {0}")]
    ParseError(String),

    #[error("I/O error during Rclone operation: {0}")]
    IoError(String),

    #[error("Remote '{0}' not found in Rclone configuration")]
    RemoteNotFound(String),

    #[error("Authentication expired or invalid for remote '{0}'. Please re-authenticate.")]
    AuthExpired(String),

    #[error("Transfer operation cancelled by user")]
    TransferCancelled,

    #[error("Operation timed out after {0} seconds")]
    Timeout(u64),

    #[error("Provider operation not supported: {0}")]
    UnsupportedOperation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for RcloneError {
    fn from(err: std::io::Error) -> Self {
        RcloneError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for RcloneError {
    fn from(err: serde_json::Error) -> Self {
        RcloneError::ParseError(err.to_string())
    }
}

pub type RcloneResult<T> = Result<T, RcloneError>;
