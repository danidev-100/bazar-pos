//! # Activation System — Offline License Key Validation
//!
//! Validates license keys entirely offline using machine-bound keys.
//! NO internet connection required — NO cloud database needed.
//!
//! ## How it works
//!
//! 1. App generates a stable **machine code** from hostname + username
//! 2. Customer sends the machine code to the developer
//! 3. Developer runs `pnpm license:generate --code <machine_code>`
//!    → outputs a unique key like `SISTEMA-VENTA-X8K9-T4P2-M7QA-3F2A`
//! 4. Customer enters the key → app validates offline via SHA-256
//! 5. On success, frontend saves activation in local SQLite
//!
//! Each key is cryptographically bound to ONE machine.

use sha2::{Digest, Sha256};

/// ⚠️  CHANGE THIS SECRET before distributing your app  ⚠️
///
/// Master secret used to generate AND validate license keys.
/// Compiled into the binary. Must match the value in scripts/generate-key.mjs.
const LICENSE_SECRET: &str = "SISTEMA-VENTA-OFFLINE-SECRET-2024";

/// Prefix for all license keys.
const KEY_PREFIX: &str = "SISTEMA-VENTA";

/// Number of hex characters from the SHA-256 hash used as the key.
const KEY_CHARS: usize = 16;

/// How to group hex chars in the displayed key: SISTEMA-VENTA-XXXX-XXXX-XXXX-XXXX
const KEY_GROUP_SIZE: usize = 4;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
}

// ──────────────────────────────────────────────
// Tauri Commands
// ──────────────────────────────────────────────

/// Generate a stable **machine code** from hostname + username.
///
/// This is what the customer sees on the activation screen and sends
/// to the developer to request a license key.
///
/// Format: a readable hex string grouped like `9F4A-2C81-AB12-55EE`
#[tauri::command]
pub fn get_machine_code() -> Result<String, String> {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .map_err(|_| "No se pudo identificar el equipo".to_string())?;

    let username = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .map_err(|_| "No se pudo identificar el usuario".to_string())?;

    let raw = format!("{}::{}", hostname, username);

    // Use SHA-256 for a more robust machine code (but display only)
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    let hash = hasher.finalize();

    // Format as groups of 4 hex chars
    let hex: String = hash[..8]
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect();

    // Insert dashes every 4 chars
    let mut grouped = String::with_capacity(19);
    for (i, c) in hex.chars().enumerate() {
        if i > 0 && i % 4 == 0 {
            grouped.push('-');
        }
        grouped.push(c);
    }

    Ok(grouped)
}

/// Validate a license key **entirely offline**.
///
/// Recomputes `SHA-256(SECRET + machine_code)`, takes the first 16 hex
/// chars, and compares them against the entered key (ignoring hyphens).
///
/// SYNCHRONOUS — no network, no DB access, instant.
#[tauri::command]
pub fn activate_license(
    license_key: String,
    machine_code: String,
) -> Result<ActivationResult, String> {
    // Strip hyphens from both entered key and normalize machine code
    let clean_key = license_key.replace('-', "");
    let clean_machine = machine_code.replace('-', "");

    let expected_prefix = KEY_PREFIX.replace('-', "");
    let expected_hash = generate_hash(&clean_machine);

    // The full expected key is: PREFIX + HASH (no hyphens for comparison)
    let expected = format!("{}{}", expected_prefix, expected_hash);

    if clean_key.to_uppercase() == expected {
        Ok(ActivationResult {
            success: true,
            message: "¡Activación exitosa! La app queda desbloqueada en este equipo.".to_string(),
        })
    } else {
        Ok(ActivationResult {
            success: false,
            message: "La clave de activación no es válida para este equipo.".to_string(),
        })
    }
}

// ──────────────────────────────────────────────
// Key derivation — MUST match generate-key.mjs
// ──────────────────────────────────────────────

/// Generate the hash portion of a license key from a machine code.
///
/// `SHA-256(SECRET + machine_code)` → first 16 hex chars
pub fn generate_hash(machine_code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(LICENSE_SECRET.as_bytes());
    hasher.update(machine_code.as_bytes());
    let result = hasher.finalize();

    result[..KEY_CHARS.min(result.len())]
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect()
}

/// Format a full license key with hyphens: SISTEMA-VENTA-XXXX-XXXX-XXXX-XXXX
pub fn format_license_key(hash: &str) -> String {
    let mut result = KEY_PREFIX.to_string();
    for (i, c) in hash.chars().enumerate() {
        if i % KEY_GROUP_SIZE == 0 {
            result.push('-');
        }
        result.push(c);
    }
    result
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_is_deterministic() {
        let code = "A73F4C2D9E811234";
        let h1 = generate_hash(code);
        let h2 = generate_hash(code);
        assert_eq!(h1, h2);
    }

    #[test]
    fn different_codes_different_keys() {
        let h1 = generate_hash("A73F4C2D9E811234");
        let h2 = generate_hash("B84F3C1D8F702345");
        assert_ne!(h1, h2);
    }

    #[test]
    fn validate_own_key() {
        let code = "9F4A-2C81-AB12-55EE";
        let hash = generate_hash(&code.replace('-', ""));
        let key = format_license_key(&hash);

        let result = activate_license(key, code.to_string())
            .expect("activation should not error");
        assert!(result.success, "should validate its own key");
    }

    #[test]
    fn reject_wrong_key() {
        let result = activate_license(
            "SISTEMA-VENTA-1234-5678-90AB-CDEF".to_string(),
            "some_code".to_string(),
        ).expect("activation should not error");
        assert!(!result.success, "should reject invalid key");
    }

    #[test]
    fn key_format_correct() {
        let hash = "A73F4C2D9E811234";
        let key = format_license_key(hash);
        assert_eq!(key, "SISTEMA-VENTA-A73F-4C2D-9E81-1234");
    }

    #[test]
    fn validation_is_case_insensitive() {
        let code = "TEST-CODE";
        let hash = generate_hash(code);
        let key = format_license_key(&hash);

        // Test with lowercase input
        let lower = key.to_lowercase();
        let result = activate_license(lower, code.to_string())
            .expect("activation should not error");
        assert!(result.success, "should accept lowercase key");
    }
}
