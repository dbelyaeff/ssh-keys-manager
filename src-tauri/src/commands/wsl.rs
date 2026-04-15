use std::process::Command;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use tauri::command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WslDistro {
    pub name: String,
}

pub trait WslRunner {
    fn list_distros(&self) -> Result<Vec<String>, String>;
    fn get_user(&self, distro: &str) -> Result<String, String>;
}

pub struct RealWslRunner;

impl WslRunner for RealWslRunner {
    fn list_distros(&self) -> Result<Vec<String>, String> {
        #[cfg(not(windows))]
        {
            return Err("WSL is only supported on Windows".to_string());
        }

        #[cfg(windows)]
        {
            let output = Command::new("wsl.exe")
                .args(&["-l", "-q"])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output()
                .map_err(|e| e.to_string())?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let distros: Vec<String> = stdout
                .lines()
                .filter(|l| !l.trim().is_empty())
                .map(|l| l.trim().replace("\0", "").to_string())
                .collect();
            
            Ok(distros)
        }
    }

    fn get_user(&self, distro: &str) -> Result<String, String> {
        #[cfg(not(windows))]
        {
            let _ = distro;
            return Err("WSL is only supported on Windows".to_string());
        }

        #[cfg(windows)]
        {
            let output = Command::new("wsl.exe")
                .args(&["-d", distro, "whoami"])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output()
                .map_err(|e| e.to_string())?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(stdout.trim().replace("\0", "").to_string())
        }
    }
}

fn get_wsl_ssh_dir_path(distro: &str, user: &str) -> PathBuf {
    PathBuf::from(format!(r"\\wsl$\{}\home\{}\.ssh", distro, user))
}

#[command]
pub async fn get_wsl_distros() -> Result<Vec<WslDistro>, String> {
    let runner = RealWslRunner;
    let names = runner.list_distros()?;
    Ok(names.into_iter().map(|name| WslDistro { name }).collect())
}

#[command]
pub async fn sync_to_wsl(distro: String) -> Result<(), String> {
    let runner = RealWslRunner;
    sync_logic(&runner, distro)
}

fn sync_logic<R: WslRunner>(runner: &R, distro: String) -> Result<(), String> {
    let user = runner.get_user(&distro)?;
    let wsl_ssh_dir = get_wsl_ssh_dir_path(&distro, &user);

    let win_home = dirs::home_dir().ok_or("Could not find Windows home directory")?;
    let win_ssh_dir = win_home.join(".ssh");

    if !win_ssh_dir.exists() {
        return Err("Windows .ssh directory does not exist".to_string());
    }

    if !wsl_ssh_dir.exists() {
        fs::create_dir_all(&wsl_ssh_dir).map_err(|e| format!("Failed to create WSL .ssh directory: {}", e))?;
    }

    let entries = fs::read_dir(&win_ssh_dir).map_err(|e| format!("Failed to read Windows .ssh directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            let file_name = path.file_name().ok_or("Invalid file name")?;
            let dest_path = wsl_ssh_dir.join(file_name);
            fs::copy(&path, &dest_path).map_err(|e| format!("Failed to copy {:?} to WSL: {}", file_name, e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockWslRunner {
        distros: Vec<String>,
        user: String,
        should_fail: bool,
    }

    impl WslRunner for MockWslRunner {
        fn list_distros(&self) -> Result<Vec<String>, String> {
            if self.should_fail {
                return Err("Mock error".to_string());
            }
            Ok(self.distros.clone())
        }

        fn get_user(&self, _distro: &str) -> Result<String, String> {
            if self.should_fail {
                return Err("Mock error".to_string());
            }
            Ok(self.user.clone())
        }
    }

    #[test]
    fn test_wsl_ssh_dir_path() {
        let path = get_wsl_ssh_dir_path("Ubuntu", "dima");
        assert_eq!(path, PathBuf::from(r"\\wsl$\Ubuntu\home\dima\.ssh"));
    }

    #[test]
    fn test_mock_runner_list() {
        let runner = MockWslRunner {
            distros: vec!["Ubuntu".to_string(), "Debian".to_string()],
            user: "testuser".to_string(),
            should_fail: false,
        };
        let distros = runner.list_distros().unwrap();
        assert_eq!(distros.len(), 2);
        assert_eq!(distros[0], "Ubuntu");
    }

    #[test]
    fn test_mock_runner_user() {
        let runner = MockWslRunner {
            distros: vec![],
            user: "testuser".to_string(),
            should_fail: false,
        };
        let user = runner.get_user("Ubuntu").unwrap();
        assert_eq!(user, "testuser");
    }

    #[test]
    fn test_mock_runner_fail() {
        let runner = MockWslRunner {
            distros: vec![],
            user: "".to_string(),
            should_fail: true,
        };
        assert!(runner.list_distros().is_err());
        assert!(runner.get_user("Ubuntu").is_err());
    }

    #[test]
    fn test_sync_logic_fail() {
        let runner = MockWslRunner {
            distros: vec![],
            user: "".to_string(),
            should_fail: true,
        };
        let result = sync_logic(&runner, "Ubuntu".to_string());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Mock error");
    }
}
