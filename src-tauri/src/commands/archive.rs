use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{Argon2, Params, Version};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use anyhow::{Context, Result};
use crate::commands::servers::{parse_config_str, ServerConfig};

const MAGIC: &[u8] = b"SSHPACK01";
const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;

fn ssh_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Cannot find home directory")?;
    Ok(home.join(".ssh"))
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32]> {
    let params = Params::new(65536, 3, 4, Some(32)).map_err(|e| anyhow::anyhow!("Argon2 params: {}", e))?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| anyhow::anyhow!("Argon2 error: {e}"))?;
    Ok(key)
}

fn build_tar(keys: &[String], servers: &[String]) -> Result<Vec<u8>> {
    let dir = ssh_dir()?;
    let config_path = dir.join("config");
    let mut tar_buf = Vec::new();
    {
        let mut tar = tar::Builder::new(&mut tar_buf);
        for key_name in keys {
            let priv_path = dir.join(key_name);
            let pub_path = priv_path.with_extension("pub");
            if priv_path.exists() {
                tar.append_path_with_name(&priv_path, format!("keys/{key_name}"))?;
            }
            if pub_path.exists() {
                tar.append_path_with_name(&pub_path, format!("keys/{key_name}.pub"))?;
            }
        }
        if !servers.is_empty() && config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            let all_servers = parse_config_str(&content);
            let selected: Vec<&ServerConfig> = all_servers
                .iter()
                .filter(|s| servers.contains(&s.host))
                .collect();
            let filtered = selected
                .iter()
                .map(|s| {
                    let mut block = format!("Host {}\n", s.host);
                    if !s.hostname.is_empty() { block.push_str(&format!("    HostName {}\n", s.hostname)); }
                    if !s.user.is_empty() { block.push_str(&format!("    User {}\n", s.user)); }
                    if s.port != 22 { block.push_str(&format!("    Port {}\n", s.port)); }
                    if !s.identity_file.is_empty() { block.push_str(&format!("    IdentityFile {}\n", s.identity_file)); }
                    block
                })
                .collect::<Vec<_>>()
                .join("\n");
            let bytes = filtered.as_bytes();
            let mut header = tar::Header::new_gnu();
            header.set_size(bytes.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            tar.append_data(&mut header, "servers/config", bytes)?;
        }
        tar.finish()?;
    }
    Ok(tar_buf)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportParams {
    pub keys: Vec<String>,
    pub servers: Vec<String>,
    pub password: Option<String>,
    pub dest_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub keys: Vec<String>,
    pub servers: Vec<String>,
    pub encrypted: bool,
}

#[tauri::command]
pub async fn export_archive(params: ExportParams) -> Result<(), String> {
    let tar_data = build_tar(&params.keys, &params.servers).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    out.extend_from_slice(MAGIC);

    if let Some(ref pw) = params.password {
        let mut salt = [0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        let key_bytes = derive_key(pw, &salt).map_err(|e| e.to_string())?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher
            .encrypt(&nonce, tar_data.as_ref())
            .map_err(|e| format!("Encrypt error: {e}"))?;
        out.push(1u8); // encrypted flag
        out.extend_from_slice(&salt);
        out.extend_from_slice(&nonce);
        out.extend_from_slice(&ciphertext);
    } else {
        out.push(0u8); // not encrypted
        out.extend_from_slice(&tar_data);
    }

    fs::write(&params.dest_path, &out).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn import_archive(src_path: String, password: Option<String>) -> Result<ImportResult, String> {
    let data = fs::read(&src_path).map_err(|e| e.to_string())?;
    if !data.starts_with(MAGIC) {
        return Err("Invalid .sshpack file".to_string());
    }
    let rest = &data[MAGIC.len()..];
    let encrypted = rest[0] == 1;
    let payload = &rest[1..];

    let tar_data = if encrypted {
        let pw = password.ok_or("Password required")?;
        let salt = &payload[..SALT_LEN];
        let nonce_bytes = &payload[SALT_LEN..SALT_LEN + NONCE_LEN];
        let ciphertext = &payload[SALT_LEN + NONCE_LEN..];
        let key_bytes = derive_key(&pw, salt).map_err(|e| e.to_string())?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Wrong password or corrupted file")?
    } else {
        payload.to_vec()
    };

    // List contents
    let mut archive = tar::Archive::new(std::io::Cursor::new(&tar_data));
    let mut keys = Vec::new();
    let mut servers = Vec::new();

    for entry in archive.entries().map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?;
        let path_str = path.to_string_lossy().to_string();
        if path_str.starts_with("keys/") && !path_str.ends_with(".pub") {
            let name = path_str.trim_start_matches("keys/").to_string();
            keys.push(name);
        } else if path_str == "servers/config" {
            // Parse server names
            let mut content = String::new();
            let mut entry2 = entry;
            entry2.read_to_string(&mut content).map_err(|e| e.to_string())?;
            for srv in parse_config_str(&content) {
                servers.push(srv.host);
            }
        }
    }

    Ok(ImportResult { keys, servers, encrypted })
}

#[tauri::command]
pub async fn apply_import(
    src_path: String,
    password: Option<String>,
    selected_keys: Vec<String>,
    selected_servers: Vec<String>,
    _overwrite: bool,
) -> Result<(), String> {
    let data = fs::read(&src_path).map_err(|e| e.to_string())?;
    if !data.starts_with(MAGIC) {
        return Err("Invalid .sshpack file".to_string());
    }
    let rest = &data[MAGIC.len()..];
    let encrypted = rest[0] == 1;
    let payload = &rest[1..];

    let tar_data = if encrypted {
        let pw = password.ok_or("Password required")?;
        let salt = &payload[..SALT_LEN];
        let nonce_bytes = &payload[SALT_LEN..SALT_LEN + NONCE_LEN];
        let ciphertext = &payload[SALT_LEN + NONCE_LEN..];
        let key_bytes = derive_key(&pw, salt).map_err(|e| e.to_string())?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Wrong password or corrupted file")?
    } else {
        payload.to_vec()
    };

    let dir = ssh_dir().map_err(|e| e.to_string())?;
    let mut archive = tar::Archive::new(std::io::Cursor::new(&tar_data));

    for entry in archive.entries().map_err(|e| e.to_string())? {
        let mut entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?.to_string_lossy().to_string();

        if path.starts_with("keys/") {
            let file_name = path.trim_start_matches("keys/");
            let key_name = file_name.trim_end_matches(".pub");
            if selected_keys.contains(&key_name.to_string()) {
                let dest = dir.join(file_name);
                
                // Handle overwrite logic for keys
                if !_overwrite && dest.exists() {
                    continue;
                }

                let mut content = Vec::new();
                entry.read_to_end(&mut content).map_err(|e| e.to_string())?;
                fs::write(&dest, &content).map_err(|e| e.to_string())?;
                if !path.ends_with(".pub") {
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(&dest, fs::Permissions::from_mode(0o600))
                        .map_err(|e| e.to_string())?;
                }
            }
        } else if path == "servers/config" {
            let mut content = String::new();
            entry.read_to_string(&mut content).map_err(|e| e.to_string())?;
            let incoming = parse_config_str(&content);
            let config_path = dir.join("config");
            let existing_content = if config_path.exists() {
                fs::read_to_string(&config_path).map_err(|e| e.to_string())?
            } else {
                String::new()
            };
            let mut existing = parse_config_str(&existing_content);
            for srv in incoming {
                if selected_servers.contains(&srv.host) {
                    if let Some(pos) = existing.iter().position(|s| s.host == srv.host) {
                        // Skip if overwrite is false
                        if _overwrite {
                            existing[pos] = srv;
                        }
                    } else {
                        existing.push(srv);
                    }
                }
            }
            let new_content = existing.iter().map(|s| {
                let mut block = format!("Host {}\n", s.host);
                if !s.hostname.is_empty() { block.push_str(&format!("    HostName {}\n", s.hostname)); }
                if !s.user.is_empty() { block.push_str(&format!("    User {}\n", s.user)); }
                if s.port != 22 { block.push_str(&format!("    Port {}\n", s.port)); }
                if !s.identity_file.is_empty() { block.push_str(&format!("    IdentityFile {}\n", s.identity_file)); }
                block
            }).collect::<Vec<_>>().join("\n");
            let tmp = config_path.with_extension("tmp");
            fs::write(&tmp, &new_content).map_err(|e| e.to_string())?;
            fs::rename(&tmp, &config_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
