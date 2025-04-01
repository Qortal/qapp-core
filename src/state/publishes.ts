import { create } from "zustand";
import { QortalGetMetadata } from "../types/interfaces/resources";
import { Resource } from "../hooks/useResources";

interface PublishCache {
  data: Resource | null;
  expiry: number;
}

export type Status =
| 'PUBLISHED'
| 'NOT_PUBLISHED'
| 'DOWNLOADING'
| 'DOWNLOADED'
| 'BUILDING'
| 'READY'
| 'MISSING_DATA'
| 'BUILD_FAILED'
| 'UNSUPPORTED'
| 'BLOCKED'
| 'FAILED_TO_DOWNLOAD'
| 'REFETCHING'
| 'SEARCHING'

export interface ResourceStatus {
    status: Status
    localChunkCount: number
    totalChunkCount: number
    percentLoaded: number

} 
interface PublishState {
  publishes: Record<string, PublishCache>;
  resourceStatus: Record<string, ResourceStatus | null>;
  setResourceStatus: (qortalGetMetadata: QortalGetMetadata, data: ResourceStatus | null) => void;
  getPublish: (qortalGetMetadata: QortalGetMetadata | null, ignoreExpire?: boolean) => Resource | null;
  getResourceStatus: (resourceId: string) => ResourceStatus | null;
  setPublish: (qortalGetMetadata: QortalGetMetadata, data: Resource | null, customExpiry?: number) => void;
  clearExpiredPublishes: () => void;
  publishExpiryDuration: number; // Default expiry duration
}

export const usePublishStore = create<PublishState>((set, get) => ({
  resourceStatus: {},
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
  setResourceStatus: (qortalGetMetadata, data) => {
    const id = `${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`;
    const existingData = get().resourceStatus[id] || {};
    set((state) => ({
      resourceStatus: {
        ...state.resourceStatus,
        [id]: !data ? null : {
          ...existingData,
          ...data
        },
      },
    }));
  },
  getResourceStatus: (resourceId) => {
    const status = get().resourceStatus[resourceId];
    return status || null;
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
