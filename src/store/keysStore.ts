import { create } from "zustand";
import { SshKey, KeyContent, scanSshKeys, readKeyContent } from "@/lib/tauri";

interface KeysState {
  keys: SshKey[];
  selectedKey: string | null;
  keyContent: KeyContent | null;
  loading: boolean;
  checkedKeys: string[];
  setCheckedKeys: (keys: string[]) => void;
  loadKeys: () => Promise<void>;
  selectKey: (name: string) => Promise<void>;
  setKeys: (keys: SshKey[]) => void;
}

export const useKeysStore = create<KeysState>((set, get) => ({
  keys: [],
  selectedKey: null,
  keyContent: null,
  loading: false,
  checkedKeys: [],
  setCheckedKeys: (checkedKeys: string[]) => set({ checkedKeys }),

  loadKeys: async () => {
    set({ loading: true });
    try {
      const keys = await scanSshKeys();
      set({ keys });
      const { selectedKey } = get();
      if (!selectedKey && keys.length > 0) {
        await get().selectKey(keys[0].name);
      }
    } finally {
      set({ loading: false });
    }
  },

  selectKey: async (name: string) => {
    set({ selectedKey: name, keyContent: null });
    try {
      const content = await readKeyContent(name);
      set({ keyContent: content });
    } catch {
      set({ keyContent: null });
    }
  },

  setKeys: (keys: SshKey[]) => set({ keys }),
}));
