use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::State;

const SERVICE_TYPE: &str = "_sshmanager._tcp.local.";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub name: String,
    pub ip: String,
    pub port: u16,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerTransferData {
    pub keys: Vec<KeyTransfer>,
    pub servers: Vec<ServerTransfer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyTransfer {
    pub name: String,
    pub private_content: String,
    pub public_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerTransfer {
    pub host: String,
    pub hostname: String,
    pub user: String,
    pub port: u16,
    pub identity_file: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct IncomingTransfer {
    pub from_name: String,
    pub from_ip: String,
    pub pin: String,
    pub connection_id: String,
    pub keys: Vec<String>,
    pub servers: Vec<String>,
}

pub struct PeerState {
    pub peers: Arc<Mutex<Vec<Peer>>>,
    pub daemon: Mutex<Option<ServiceDaemon>>,
    pub tcp_port: Mutex<u16>,
    pub my_ip: Mutex<String>,
    pub incoming: Arc<Mutex<Vec<IncomingTransfer>>>,
    pub received_data: Arc<Mutex<HashMap<String, PeerTransferData>>>,
}

impl PeerState {
    pub fn new() -> Self {
        Self {
            peers: Arc::new(Mutex::new(Vec::new())),
            daemon: Mutex::new(None),
            tcp_port: Mutex::new(0),
            my_ip: Mutex::new(String::new()),
            incoming: Arc::new(Mutex::new(Vec::new())),
            received_data: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}

#[tauri::command]
pub async fn start_peer_service(state: State<'_, PeerState>) -> Result<u16, String> {
    // Stop existing service if running
    if let Some(daemon) = state.daemon.lock().unwrap().take() {
        daemon.shutdown().ok();
    }

    // Detect local IP
    let my_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());
    *state.my_ip.lock().unwrap() = my_ip.clone();

    // Start TCP listener on random port
    let listener = TcpListener::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    *state.tcp_port.lock().unwrap() = port;

    // Create ONE daemon for both registration and browsing
    let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS daemon error: {e}"))?;

    // Register our service
    let host_name = get_hostname();
    let service = ServiceInfo::new(
        SERVICE_TYPE,
        &host_name,
        &format!("{}.local.", host_name),
        &my_ip,
        port,
        None,
    )
    .map_err(|e| format!("ServiceInfo error: {e}"))?;

    daemon
        .register(service)
        .map_err(|e| format!("Register error: {e}"))?;

    // Start browsing on the SAME daemon
    let receiver = daemon
        .browse(SERVICE_TYPE)
        .map_err(|e| format!("Browse error: {e}"))?;

    // Store daemon
    *state.daemon.lock().unwrap() = Some(daemon);

    // Spawn background thread: continuous mDNS browsing
    let peers_ref = state.peers.clone();
    let my_ip_for_browse = my_ip.clone();
    std::thread::spawn(move || {
        loop {
            match receiver.recv_timeout(Duration::from_millis(500)) {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    let ip = info
                        .get_addresses()
                        .iter()
                        .find(|a| a.is_ipv4())
                        .or_else(|| info.get_addresses().iter().next())
                        .map(|a| a.to_string())
                        .unwrap_or_default();

                    // Skip self
                    if ip == my_ip_for_browse || ip.is_empty() {
                        continue;
                    }

                    let peer = Peer {
                        name: info.get_hostname().trim_end_matches('.').to_string(),
                        ip: ip.clone(),
                        port: info.get_port(),
                        id: format!("{}:{}", ip, info.get_port()),
                    };

                    let mut peers = peers_ref.lock().unwrap();
                    if !peers.iter().any(|p| p.id == peer.id) {
                        peers.push(peer);
                    }
                }
                Ok(ServiceEvent::ServiceRemoved(_, fullname)) => {
                    // Remove peer when service goes away
                    let mut peers = peers_ref.lock().unwrap();
                    peers.retain(|p| !fullname.contains(&p.name));
                }
                Ok(_) => {}
                Err(flume::RecvTimeoutError::Disconnected) => {
                    // Daemon was shut down, exit the loop
                    break;
                }
                Err(_) => {} // Timeout, continue
            }
        }
    });

    // Spawn TCP accept loop
    let incoming_ref = state.incoming.clone();
    let received_ref = state.received_data.clone();
    std::thread::spawn(move || {
        listener.set_nonblocking(false).ok();
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                stream
                    .set_read_timeout(Some(Duration::from_secs(30)))
                    .ok();
                let _ = handle_incoming_connection(&mut stream, &incoming_ref, &received_ref);
            }
        }
    });

    Ok(port)
}

fn handle_incoming_connection(
    stream: &mut TcpStream,
    incoming: &Mutex<Vec<IncomingTransfer>>,
    received: &Mutex<HashMap<String, PeerTransferData>>,
) -> Result<(), String> {
    // Read length-prefixed JSON
    let mut len_buf = [0u8; 4];
    stream.read_exact(&mut len_buf).map_err(|e| e.to_string())?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len > 10_000_000 {
        return Err("Payload too large".into());
    }

    let mut buf = vec![0u8; len];
    stream.read_exact(&mut buf).map_err(|e| e.to_string())?;

    let payload: serde_json::Value = serde_json::from_slice(&buf).map_err(|e| e.to_string())?;

    let msg_type = payload
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    match msg_type {
        "pin_request" => {
            let pin = payload
                .get("pin")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let from_name = payload
                .get("from_name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let from_ip = stream
                .peer_addr()
                .map(|a| a.ip().to_string())
                .unwrap_or_else(|_| "unknown".to_string());
            let conn_id = format!("conn_{}", rand::thread_rng().gen::<u32>());

            let keys: Vec<String> = payload
                .get("keys")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            let servers: Vec<String> = payload
                .get("servers")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();

            incoming.lock().unwrap().push(IncomingTransfer {
                from_name,
                from_ip,
                pin,
                connection_id: conn_id.clone(),
                keys,
                servers,
            });

            // Respond with connection_id
            let resp = serde_json::json!({ "status": "pending", "connection_id": conn_id });
            let resp_bytes = serde_json::to_vec(&resp).unwrap();
            let len = (resp_bytes.len() as u32).to_be_bytes();
            stream.write_all(&len).ok();
            stream.write_all(&resp_bytes).ok();
        }
        "data_transfer" => {
            let conn_id = payload
                .get("connection_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let data: PeerTransferData =
                serde_json::from_value(payload.get("data").cloned().unwrap_or_default())
                    .map_err(|e| e.to_string())?;

            received.lock().unwrap().insert(conn_id, data);

            let resp = serde_json::json!({ "status": "received" });
            let resp_bytes = serde_json::to_vec(&resp).unwrap();
            let len = (resp_bytes.len() as u32).to_be_bytes();
            stream.write_all(&len).ok();
            stream.write_all(&resp_bytes).ok();
        }
        _ => {}
    }

    Ok(())
}

#[tauri::command]
pub async fn discover_peers(state: State<'_, PeerState>) -> Result<Vec<Peer>, String> {
    // Peers are now collected continuously by the background mDNS browse thread.
    // This command just returns whatever has been discovered so far.
    // To force a re-query, we can trigger the daemon to re-browse.
    
    // If daemon is running, trigger a new query burst
    if let Some(ref daemon) = *state.daemon.lock().unwrap() {
        // Re-browse to trigger fresh queries
        let _ = daemon.browse(SERVICE_TYPE);
    }
    
    // Wait a bit for responses to arrive
    tokio::time::sleep(Duration::from_secs(3)).await;
    
    let peers = state.peers.lock().unwrap().clone();
    Ok(peers)
}

#[tauri::command]
pub async fn get_peers(state: State<'_, PeerState>) -> Result<Vec<Peer>, String> {
    Ok(state.peers.lock().unwrap().clone())
}

#[tauri::command]
pub async fn initiate_transfer(
    peer_id: String,
    keys: Vec<String>,
    servers: Vec<String>,
) -> Result<String, String> {
    // Generate 6-digit PIN
    let pin: String = format!("{:06}", rand::thread_rng().gen_range(0..999999u32));

    // Parse host:port
    let parts: Vec<&str> = peer_id.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid peer_id format".into());
    }
    let addr = format!("{}:{}", parts[0], parts[1]);

    let mut stream = TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e: std::net::AddrParseError| e.to_string())?,
        Duration::from_secs(5),
    )
    .map_err(|e| format!("Connection failed: {e}"))?;

    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .ok();

    let my_name = get_hostname();
    let payload = serde_json::json!({
        "type": "pin_request",
        "from_name": my_name,
        "pin": pin,
        "keys": keys,
        "servers": servers,
    });

    let payload_bytes = serde_json::to_vec(&payload).unwrap();
    let len = (payload_bytes.len() as u32).to_be_bytes();
    stream.write_all(&len).map_err(|e| e.to_string())?;
    stream
        .write_all(&payload_bytes)
        .map_err(|e| e.to_string())?;

    // Read response
    let mut len_buf = [0u8; 4];
    stream
        .read_exact(&mut len_buf)
        .map_err(|e| e.to_string())?;
    let resp_len = u32::from_be_bytes(len_buf) as usize;
    let mut resp_buf = vec![0u8; resp_len];
    stream
        .read_exact(&mut resp_buf)
        .map_err(|e| e.to_string())?;

    Ok(pin)
}

#[tauri::command]
pub async fn get_incoming_transfers(
    state: State<'_, PeerState>,
) -> Result<Vec<IncomingTransfer>, String> {
    Ok(state.incoming.lock().unwrap().clone())
}

#[tauri::command]
pub async fn respond_to_transfer(
    state: State<'_, PeerState>,
    connection_id: String,
    accept: bool,
) -> Result<(), String> {
    let mut incoming = state.incoming.lock().unwrap();
    incoming.retain(|t| t.connection_id != connection_id);

    if !accept {
        return Ok(());
    }

    Ok(())
}

#[tauri::command]
pub async fn send_peer_data(
    peer_id: String,
    keys: Vec<KeyTransfer>,
    servers: Vec<ServerTransfer>,
    connection_id: String,
) -> Result<(), String> {
    let parts: Vec<&str> = peer_id.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid peer_id format".into());
    }
    let addr = format!("{}:{}", parts[0], parts[1]);

    let mut stream = TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e: std::net::AddrParseError| e.to_string())?,
        Duration::from_secs(5),
    )
    .map_err(|e| format!("Connection failed: {e}"))?;

    let data = PeerTransferData { keys, servers };
    let payload = serde_json::json!({
        "type": "data_transfer",
        "connection_id": connection_id,
        "data": data,
    });

    let payload_bytes = serde_json::to_vec(&payload).unwrap();
    let len = (payload_bytes.len() as u32).to_be_bytes();
    stream.write_all(&len).map_err(|e| e.to_string())?;
    stream
        .write_all(&payload_bytes)
        .map_err(|e| e.to_string())?;

    // Read ack
    let mut len_buf = [0u8; 4];
    stream
        .read_exact(&mut len_buf)
        .map_err(|e| e.to_string())?;
    let resp_len = u32::from_be_bytes(len_buf) as usize;
    let mut resp_buf = vec![0u8; resp_len];
    stream
        .read_exact(&mut resp_buf)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn apply_received_data(
    state: State<'_, PeerState>,
    connection_id: String,
    overwrite: bool,
) -> Result<(), String> {
    let data = state
        .received_data
        .lock()
        .unwrap()
        .remove(&connection_id)
        .ok_or("No received data for this connection")?;

    let ssh_dir = dirs::home_dir()
        .ok_or("Cannot find home directory")?
        .join(".ssh");

    // Apply keys
    for key in &data.keys {
        let priv_path = ssh_dir.join(&key.name);
        let pub_path = ssh_dir.join(format!("{}.pub", key.name));
        if !overwrite && priv_path.exists() {
            continue;
        }
        std::fs::write(&priv_path, &key.private_content).map_err(|e| e.to_string())?;
        std::fs::write(&pub_path, &key.public_content).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&priv_path, std::fs::Permissions::from_mode(0o600)).ok();
            std::fs::set_permissions(&pub_path, std::fs::Permissions::from_mode(0o644)).ok();
        }
    }

    // Apply servers
    if !data.servers.is_empty() {
        let config_path = ssh_dir.join("config");
        let mut config_content = std::fs::read_to_string(&config_path).unwrap_or_default();

        for srv in &data.servers {
            let host_block = format!(
                "\nHost {}\n  HostName {}\n  User {}\n  Port {}\n  IdentityFile {}\n",
                srv.host, srv.hostname, srv.user, srv.port, srv.identity_file
            );

            if config_content.contains(&format!("Host {}", srv.host)) {
                if overwrite {
                    let lines: Vec<&str> = config_content.lines().collect();
                    let mut new_lines: Vec<&str> = Vec::new();
                    let mut skip = false;
                    for line in &lines {
                        if line.trim().starts_with("Host ")
                            && line.trim() == format!("Host {}", srv.host)
                        {
                            skip = true;
                            continue;
                        }
                        if skip && line.trim().starts_with("Host ") {
                            skip = false;
                        }
                        if !skip {
                            new_lines.push(line);
                        }
                    }
                    config_content = new_lines.join("\n");
                    config_content.push_str(&host_block);
                }
            } else {
                config_content.push_str(&host_block);
            }
        }

        std::fs::write(&config_path, config_content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_peer_service(state: State<'_, PeerState>) -> Result<(), String> {
    if let Some(daemon) = state.daemon.lock().unwrap().take() {
        daemon.shutdown().map_err(|e| e.to_string())?;
    }
    // Clear peers
    state.peers.lock().unwrap().clear();
    Ok(())
}
