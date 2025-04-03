import { create } from "zustand";

export interface OpenIndex {
    link: string
    name: string
}

interface IndexState {
  open: OpenIndex | null;
  setOpen: (openIndex: OpenIndex | null ) => void;
}

// ✅ Typed Zustand Store
export const useIndexStore = create<IndexState>((set) => ({
  open: null,
  setOpen: (openIndex) =>
    set({ open: openIndex }),
}));
