import { create } from "zustand";

export enum IndexCategory  {
    'PUBLIC_PAGE_VIDEO' = 1,
    'PUBLIC_PAGE_AUDIO' = 2,
    'PUBLIC_PAGE_IMAGE' = 3,
    'PUBLIC_PAGE_PDF' = 4,
    'PUBLIC_PAGE_OTHER' = 5,
    'PUBLIC_RESOURCE_VIDEO' = 6,
    'PUBLIC_RESOURCE_AUDIO' = 7,
    'PUBLIC_RESOURCE_IMAGE' = 8,
    'PUBLIC_RESOURCE_PDF' = 9,
    'PUBLIC_RESOURCE_OTHER' = 10,
}

export interface OpenIndex {
    link: string
    name: string
    category: IndexCategory
    rootName: string
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
