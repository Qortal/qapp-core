import { create } from "zustand";
import { QortalGetMetadata } from "../types/interfaces/resources";
import { TemporaryResource } from "../hooks/useResources";

interface PublishCache {
  data: TemporaryResource | null;
  expiry: number;
}

interface PublishState {
  publishes: Record<string, PublishCache>;

  getPublish: (qortalGetMetadata: QortalGetMetadata | null, ignoreExpire?: boolean) => TemporaryResource | null;
  setPublish: (qortalGetMetadata: QortalGetMetadata, data: TemporaryResource | null, customExpiry?: number) => void;
  clearExpiredPublishes: () => void;
  publishExpiryDuration: number; // Default expiry duration
}

export const usePublishStore = create<PublishState>((set, get) => ({
  publishes: {},
  publishExpiryDuration: 5 * 60 * 1000, // Default expiry: 5 minutes

  getPublish: (qortalGetMetadata, ignoreExpire = false) => {
    if (!qortalGetMetadata) return null;

    const id = `${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`;
    const cache = get().publishes[id];

    if (cache) {
      if (cache.expiry > Date.now() || ignoreExpire) {
        if(cache?.data?.qortalMetadata?.size === 32) return null
        return cache.data;
      } else {
        set((state) => {
          const updatedPublishes = { ...state.publishes };
          delete updatedPublishes[id];
          return { publishes: updatedPublishes };
        });
      }
    }
    return null;
  },

  setPublish: (qortalGetMetadata, data, customExpiry) => {
    const id = `${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`;
    const expiry = Date.now() + (customExpiry || get().publishExpiryDuration);

    set((state) => ({
      publishes: {
        ...state.publishes,
        [id]: { data, expiry },
      },
    }));
  },

  clearExpiredPublishes: () => {
    set((state) => {
      const now = Date.now();
      const updatedPublishes = Object.fromEntries(
        Object.entries(state.publishes).filter(([_, cache]) => cache.expiry > now)
      );
      return { publishes: updatedPublishes };
    });
  },
}));
