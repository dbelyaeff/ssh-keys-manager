use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;
use anyhow::{Context, Result};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SshKey {
    pub name: String,
    pub path_private: String,
    pub path_public: String,
    pub key_type: String,
    pub comment: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyContent {
    pub private_content: String,
    pub public_content: String,
    pub comment: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateKeyParams {
    pub name: String,
    pub key_type: String,
    pub bits: u32,
    pub comment: String,
    pub passphrase: String,
}

fn ssh_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Cannot find home directory")?;
    Ok(home.join(".ssh"))
}

fn parse_key_type(pub_content: &str) -> String {
    pub_content
        .split_whitespace()
        .next()
        .unwrap_or("unknown")
        .replace("ssh-", "")
        .replace("ecdsa-sha2-nistp256", "ecdsa")
        .replace("ecdsa-sha2-nistp384", "ecdsa")
        .replace("ecdsa-sha2-nistp521", "ecdsa")
}

fn parse_comment(pub_content: &str) -> String {
    let parts: Vec<&str> = pub_content.split_whitespace().collect();
    if parts.len() >= 3 {
        parts[2..].join(" ")
    } else {
        String::new()
    }
}

fn is_private_key(content: &str) -> bool {
    content.contains("BEGIN") && content.contains("PRIVATE KEY")
}

#[tauri::command]
pub async fn scan_ssh_keys() -> Result<Vec<SshKey>, String> {
    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let mut keys: Vec<SshKey> = Vec::new();

    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(vec![]),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some() {
            continue; // skip .pub and others first pass
        }
        let pub_path = path.with_extension("pub");
        if !pub_path.exists() {
            continue;
        }
        let priv_content = fs::read_to_string(&path).unwrap_or_default();
        if !is_private_key(&priv_content) {
            continue;
        }
        let pub_content = fs::read_to_string(&pub_path).unwrap_or_default();
        let key_type = parse_key_type(pub_content.trim());
        let comment = parse_comment(pub_content.trim());
        let name = path.file_name().unwrap().to_string_lossy().to_string();

        keys.push(SshKey {
            name,
            path_private: path.to_string_lossy().to_string(),
            path_public: pub_path.to_string_lossy().to_string(),
            key_type,
            comment,
        });
    }

    keys.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(keys)
}

#[tauri::command]
pub async fn read_key_content(name: String) -> Result<KeyContent, String> {
    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let priv_path = dir.join(&name);
    let pub_path = priv_path.with_extension("pub");

    let private_content = fs::read_to_string(&priv_path)
        .map_err(|e| format!("Cannot read private key: {e}"))?;
    let public_content = fs::read_to_string(&pub_path)
        .map_err(|e| format!("Cannot read public key: {e}"))?;
    let comment = parse_comment(public_content.trim());

    Ok(KeyContent { private_content, public_content, comment })
}

#[tauri::command]
pub async fn save_key(
    name: String,
    private_content: String,
    public_content: String,
) -> Result<(), String> {
    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let priv_path = dir.join(&name);
    let pub_path = priv_path.with_extension("pub");

    // Write to temp, then rename (atomic)
    let tmp_priv = dir.join(format!(".{name}.tmp"));
    let tmp_pub = dir.join(format!(".{name}.pub.tmp"));

    fs::write(&tmp_priv, &private_content)
        .map_err(|e| format!("Write error: {e}"))?;
    fs::write(&tmp_pub, &public_content)
        .map_err(|e| format!("Write error: {e}"))?;

    // Set permissions
    #[cfg(unix)]
    {
        fs::set_permissions(&tmp_priv, fs::Permissions::from_mode(0o600))
            .map_err(|e| e.to_string())?;
        fs::set_permissions(&tmp_pub, fs::Permissions::from_mode(0o644))
            .map_err(|e| e.to_string())?;
    }

    fs::rename(&tmp_priv, &priv_path).map_err(|e| e.to_string())?;
    fs::rename(&tmp_pub, &pub_path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_key(name: String) -> Result<(), String> {
    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let priv_path = dir.join(&name);
    let pub_path = priv_path.with_extension("pub");

    if priv_path.exists() {
        fs::remove_file(&priv_path).map_err(|e| e.to_string())?;
    }
    if pub_path.exists() {
        fs::remove_file(&pub_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn generate_key(params: GenerateKeyParams) -> Result<(), String> {
    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let key_path = dir.join(&params.name);

    let mut cmd = Command::new("ssh-keygen");
    cmd.arg("-t").arg(&params.key_type);

    if params.bits > 0 {
        cmd.arg("-b").arg(params.bits.to_string());
    }
    if !params.comment.is_empty() {
        cmd.arg("-C").arg(&params.comment);
    }

    cmd.arg("-f").arg(&key_path);
    cmd.arg("-N").arg(&params.passphrase);

    let output = cmd.output().map_err(|e| format!("ssh-keygen error: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ssh-keygen failed: {err}"));
    }

    Ok(())
}
