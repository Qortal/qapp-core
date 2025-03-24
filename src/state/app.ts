import { create } from "zustand";

interface AppState {
  appName: string | null;
  publicSalt: string | null;
  appNameHashed: string | null;
  // Methods
  setAppState: (appState: { appName: string; publicSalt: string; appNameHashed: string }) => void;
}

// ✅ Typed Zustand Store
export const useAppStore = create<AppState>((set) => ({
  appName: null,
  publicSalt: null,
  appNameHashed: null,
  // Methods
  setAppState: (appState) =>
    set({ appName: appState.appName, publicSalt: appState.publicSalt, appNameHashed: appState.appNameHashed }),
}));
