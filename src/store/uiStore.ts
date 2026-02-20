import { create } from "zustand";

interface UIState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "keys",
  setActiveTab: (tab: string) => set({ activeTab: tab }),
}));
