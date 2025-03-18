import { create } from "zustand";
import { IdentifierBuilder } from "../utils/encryption";

interface AppState {
  appName: string | null;
  publicSalt: string | null;
  appNameHashed: string | null;
  identifierBuilder?: IdentifierBuilder | null
  // Methods
  setAppState: (appState: { appName: string; publicSalt: string; appNameHashed: string }) => void;
  setIdentifierBuilder: (builder: IdentifierBuilder) => void;
}

// ✅ Typed Zustand Store
export const useAppStore = create<AppState>((set) => ({
  appName: null,
  publicSalt: null,
  appNameHashed: null,
  identifierBuilder: null,
  // Methods
  setAppState: (appState) =>
    set({ appName: appState.appName, publicSalt: appState.publicSalt, appNameHashed: appState.appNameHashed }),
  setIdentifierBuilder: (identifierBuilder) =>
    set({ identifierBuilder })
}));
