import { create } from "zustand";
import { ServerConfig, parseSshConfig } from "@/lib/tauri";

interface ServersState {
  servers: ServerConfig[];
  selectedServer: string | null;
  selectedServerConfig: ServerConfig | null;
  loading: boolean;
  checkedServers: string[];
  setCheckedServers: (servers: string[]) => void;
  loadServers: () => Promise<void>;
  selectServer: (host: string) => void;
  setServers: (servers: ServerConfig[]) => void;
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  selectedServer: null,
  selectedServerConfig: null,
  loading: false,
  checkedServers: [],
  setCheckedServers: (checkedServers: string[]) => set({ checkedServers }),

  loadServers: async () => {
    set({ loading: true });
    try {
      const servers = await parseSshConfig();
      set({ servers });
      const { selectedServer } = get();
      if (!selectedServer && servers.length > 0) {
        get().selectServer(servers[0].host);
      }
    } finally {
      set({ loading: false });
    }
  },

  selectServer: (host: string) => {
    const { servers } = get();
    const config = servers.find((s) => s.host === host) || null;
    set({ selectedServer: host, selectedServerConfig: config });
  },

  setServers: (servers: ServerConfig[]) => set({ servers }),
}));
