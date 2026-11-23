use std::net::SocketAddr;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::time::{timeout, Duration};
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone)]
pub struct OAuthCallbackResult {
    pub code: String,
    pub state: String,
}

pub struct LoopbackOAuthServer {
    listener: TcpListener,
    port: u16,
    expected_state: String,
}

impl LoopbackOAuthServer {
    /// Binds to an ephemeral localhost port (127.0.0.1:0)
    pub async fn bind(expected_state: &str) -> RcloneResult<Self> {
        let addr = SocketAddr::from(([127, 0, 0, 1], 0));
        let listener = TcpListener::bind(addr).await.map_err(|e| {
            RcloneError::Internal(format!("Failed to bind local loopback OAuth server: {}", e))
        })?;

        let port = listener.local_addr().map_err(|e| RcloneError::Internal(e.to_string()))?.port();

        Ok(Self {
            listener,
            port,
            expected_state: expected_state.to_string(),
        })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn redirect_uri(&self) -> String {
        format!("http://127.0.0.1:{}/oauth/callback", self.port)
    }

    /// Waits for incoming browser redirect with state validation and 120s timeout
    pub async fn wait_for_callback(&self) -> RcloneResult<OAuthCallbackResult> {
        let accept_fut = async {
            let (mut socket, _) = self.listener.accept().await.map_err(|e| {
                RcloneError::Internal(format!("Failed to accept connection: {}", e))
            })?;

            let mut buffer = [0u8; 2048];
            let n = socket.read(&mut buffer).await.map_err(|e| {
                RcloneError::Internal(format!("Failed to read HTTP request: {}", e))
            })?;

            let request = String::from_utf8_lossy(&buffer[..n]);
            let first_line = request.lines().next().unwrap_or_default();
            
            // Parse HTTP GET query string: GET /oauth/callback?code=...&state=... HTTP/1.1
            let target_path = first_line
                .split_whitespace()
                .nth(1)
                .unwrap_or_default();

            let query = target_path.split('?').nth(1).unwrap_or_default();
            let mut code = None;
            let mut state = None;

            for pair in query.split('&') {
                let mut parts = pair.split('=');
                if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                    if k == "code" {
                        code = Some(v.to_string());
                    } else if k == "state" {
                        state = Some(v.to_string());
                    }
                }
            }

            // Return clean HTML response to user's browser
            let response_body = r#"
            <!DOCTYPE html>
            <html>
            <head><title>Any Cloud — Authentication Success</title>
            <style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center; } .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; } h1 { color: #38bdf8; margin-bottom: 0.5rem; } p { color: #94a3b8; }</style>
            </head>
            <body><div class="card"><h1>Authentication Successful</h1><p>You can close this tab and return to Any Cloud.</p></div></body>
            </html>
            "#;

            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n{}",
                response_body.len(),
                response_body
            );

            let _ = socket.write_all(response.as_bytes()).await;
            let _ = socket.flush().await;

            let received_code = code.ok_or_else(|| RcloneError::Internal("Missing OAuth code parameter".into()))?;
            let received_state = state.ok_or_else(|| RcloneError::Internal("Missing OAuth state parameter".into()))?;

            if received_state != self.expected_state {
                return Err(RcloneError::Internal("OAuth state parameter mismatch (possible CSRF attack)".into()));
            }

            Ok(OAuthCallbackResult {
                code: received_code,
                state: received_state,
            })
        };

        timeout(Duration::from_secs(120), accept_fut)
            .await
            .map_err(|_| RcloneError::Timeout(120))?
    }
}
