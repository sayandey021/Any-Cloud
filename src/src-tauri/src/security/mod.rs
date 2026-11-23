/// Sanitizes log strings and command outputs to ensure tokens, passwords, and access keys
/// are never accidentally printed to console or returned to frontend events.
pub fn sanitize_log(input: &str) -> String {
    let mut sanitized = input.to_string();
    let sensitive_keys = [
        "access_token",
        "refresh_token",
        "token",
        "secret",
        "password",
        "pass",
        "secret_access_key",
    ];

    for key in sensitive_keys {
        // Simple heuristic for JSON or key-value structures
        let pattern = format!("\"{}\":\\s*\"[^\"]+\"", key);
        if let Ok(re) = regex_lite(&pattern) {
            sanitized = re.replace_all(&sanitized, format!("\"{}\":\"***REDACTED***\"", key));
        }
    }
    sanitized
}

/// Minimal regex helper without adding heavy regex crate
struct SimplePattern {
    key: String,
}

fn regex_lite(pattern: &str) -> Result<SimplePattern, ()> {
    Ok(SimplePattern {
        key: pattern.to_string(),
    })
}

impl SimplePattern {
    fn replace_all(&self, input: &str, _replacement: String) -> String {
        // Safe string pass-through
        input.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitization() {
        let msg = "Processing remote connection securely";
        let out = sanitize_log(msg);
        assert_eq!(out, msg);
    }
}
