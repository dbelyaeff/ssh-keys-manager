import { invoke } from "@tauri-apps/api/core";

export interface SshKey {
  name: string;
  path_private: string;
  path_public: string;
  key_type: string;
  comment: string;
}

export interface KeyContent {
  private_content: string;
  public_content: string;
  comment: string;
}

export interface ServerConfig {
  host: string;
  hostname: string;
  user: string;
  port: number;
  identity_file: string;
}

export interface GenerateKeyParams {
  name: string;
  key_type: string;
  bits: number;
  comment: string;
  passphrase: string;
}

export interface ExportParams {
  keys: string[];
  servers: string[];
  password: string | null;
  dest_path: string;
}

export interface ImportResult {
  keys: string[];
  servers: string[];
  encrypted: boolean;
}

export interface Peer {
  name: string;
  ip: string;
  port: number;
  id: string;
}

// Keys
export const scanSshKeys = () => invoke<SshKey[]>("scan_ssh_keys");
export const readKeyContent = (name: string) =>
  invoke<KeyContent>("read_key_content", { name });
export const saveKey = (
  name: string,
  privateContent: string,
  publicContent: string
) => invoke<void>("save_key", { name, privateContent, publicContent });
export const deleteKey = (name: string) =>
  invoke<void>("delete_key", { name });
export const generateKey = (params: GenerateKeyParams) =>
  invoke<void>("generate_key", { params });

// Servers
export const parseSshConfig = () => invoke<ServerConfig[]>("parse_ssh_config");
export const saveServer = (oldHost: string, config: ServerConfig) =>
  invoke<void>("save_server", { oldHost, config });
export const deleteServer = (host: string) =>
  invoke<void>("delete_server", { host });

// Connect
export const connectToServer = (config: ServerConfig, terminal: string) =>
  invoke<void>("connect_to_server", { config, terminal });
export const installKeyToServer = (
  config: ServerConfig,
  password: string
) => invoke<void>("install_key_to_server", { config, password });
export const removeKnownHost = (hostname: string) =>
  invoke<void>("remove_known_host", { hostname });
export const checkServerConnection = (config: ServerConfig) =>
  invoke<boolean>("check_server_connection", { config });
export const checkInstalledTerminals = () =>
  invoke<string[]>("check_installed_terminals");

// Archive
export const exportArchive = (params: ExportParams) =>
  invoke<void>("export_archive", { params });
export const importArchive = (srcPath: string, password: string | null) =>
  invoke<ImportResult>("import_archive", { srcPath, password });
export const applyImport = (
  srcPath: string,
  password: string | null,
  selectedKeys: string[],
  selectedServers: string[],
  overwrite: boolean
) =>
  invoke<void>("apply_import", {
    srcPath,
    password,
    selectedKeys,
    selectedServers,
    overwrite,
  });

// Peers
export interface IncomingTransfer {
  from_name: string;
  from_ip: string;
  pin: string;
  connection_id: string;
  keys: string[];
  servers: string[];
}

export interface KeyTransfer {
  name: string;
  private_content: string;
  public_content: string;
}

export interface ServerTransfer {
  host: string;
  hostname: string;
  user: string;
  port: number;
  identity_file: string;
}

export const startPeerService = () => invoke<number>("start_peer_service");
export const stopPeerService = () => invoke<void>("stop_peer_service");
export const discoverPeers = () => invoke<Peer[]>("discover_peers");
export const getPeers = () => invoke<Peer[]>("get_peers");
export const initiateTransfer = (peerId: string, keys: string[], servers: string[]) =>
  invoke<{ pin: string; connection_id: string }>("initiate_transfer", { peerId, keys, servers });
export const getIncomingTransfers = () =>
  invoke<IncomingTransfer[]>("get_incoming_transfers");
export const respondToTransfer = (connectionId: string, accept: boolean) =>
  invoke<void>("respond_to_transfer", { connectionId, accept });
export const sendPeerData = (
  peerId: string,
  keys: KeyTransfer[],
  servers: ServerTransfer[],
  connectionId: string
) => invoke<void>("send_peer_data", { peerId, keys, servers, connectionId });
export const applyReceivedData = (connectionId: string, overwrite: boolean) =>
  invoke<void>("apply_received_data", { connectionId, overwrite });
