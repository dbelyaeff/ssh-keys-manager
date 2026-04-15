use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use anyhow::{Context, Result};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub hostname: String,
    pub user: String,
    pub port: u16,
    pub identity_file: String,
}

fn ssh_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Cannot find home directory")?;
    Ok(home.join(".ssh"))
}

fn config_path() -> Result<PathBuf> {
    Ok(ssh_dir()?.join("config"))
}

pub fn parse_config_str(content: &str) -> Vec<ServerConfig> {
    let mut servers = Vec::new();
    let mut current: Option<ServerConfig> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = trimmed.splitn(2, char::is_whitespace).collect();
        if parts.len() < 2 {
            continue;
        }
        let key = parts[0].to_lowercase();
        let value = parts[1].trim().to_string();

        match key.as_str() {
            "host" => {
                if let Some(srv) = current.take() {
                    servers.push(srv);
                }
                current = Some(ServerConfig {
                    host: value,
                    hostname: String::new(),
                    user: "root".to_string(),
                    port: 22,
                    identity_file: String::new(),
                });
            }
            "hostname" => { if let Some(ref mut s) = current { s.hostname = value; } }
            "user" => { if let Some(ref mut s) = current { s.user = value; } }
            "port" => { if let Some(ref mut s) = current { s.port = value.parse().unwrap_or(22); } }
            "identityfile" => { if let Some(ref mut s) = current { s.identity_file = value; } }
            _ => {}
        }
    }

    if let Some(srv) = current {
        servers.push(srv);
    }

    servers
}

fn serialize_server(srv: &ServerConfig) -> String {
    let mut out = format!("Host {}\n", srv.host);
    if !srv.hostname.is_empty() {
        out.push_str(&format!("    HostName {}\n", srv.hostname));
    }
    if !srv.user.is_empty() {
        out.push_str(&format!("    User {}\n", srv.user));
    }
    if srv.port != 22 {
        out.push_str(&format!("    Port {}\n", srv.port));
    }
    if !srv.identity_file.is_empty() {
        out.push_str(&format!("    IdentityFile {}\n", srv.identity_file));
    }
    out
}

#[tauri::command]
pub async fn parse_ssh_config() -> Result<Vec<ServerConfig>, String> {
    let path = config_path().map_err(|e| e.to_string())?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_config_str(&content))
}

#[tauri::command]
pub async fn save_server(old_host: String, config: ServerConfig) -> Result<(), String> {
    let path = config_path().map_err(|e| e.to_string())?;
    let existing = if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let mut servers = parse_config_str(&existing);

    if old_host.is_empty() {
        // New server: check if host already exists
        if servers.iter().any(|s| s.host == config.host) {
            return Err(format!("Хост «{}» уже существует", config.host));
        }
        servers.push(config);
    } else {
        // Update existing
        // If renaming, check if new name already exists elsewhere
        if config.host != old_host && servers.iter().any(|s| s.host == config.host) {
            return Err(format!("Хост «{}» уже существует", config.host));
        }

        let mut found = false;
        for srv in &mut servers {
            if srv.host == old_host {
                *srv = config.clone();
                found = true;
                break;
            }
        }
        if !found {
            servers.push(config);
        }
    }

    let new_content = servers.iter().map(serialize_server).collect::<Vec<_>>().join("\n");

    // Write atomically
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, &new_content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_server(host: String) -> Result<(), String> {
    let path = config_path().map_err(|e| e.to_string())?;
    if !path.exists() {
        return Ok(());
    }
    let existing = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let servers = parse_config_str(&existing)
        .into_iter()
        .filter(|s| s.host != host)
        .collect::<Vec<_>>();

    let new_content = servers.iter().map(serialize_server).collect::<Vec<_>>().join("\n");
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, &new_content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;

    Ok(())
}
