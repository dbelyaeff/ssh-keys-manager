import { create } from "zustand";

interface UIState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  exportDialogOpen: boolean;
  exportPreselectedKeys: string[] | null;
  exportPreselectedServers: string[] | null;
  openExportDialog: (keys?: string[], servers?: string[]) => void;
  closeExportDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "keys",
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  exportDialogOpen: false,
  exportPreselectedKeys: null,
  exportPreselectedServers: null,
  openExportDialog: (keys, servers) =>
    set({
      exportDialogOpen: true,
      exportPreselectedKeys: keys || null,
      exportPreselectedServers: servers || null,
    }),
  closeExportDialog: () =>
    set({ exportDialogOpen: false, exportPreselectedKeys: null, exportPreselectedServers: null }),
}));
