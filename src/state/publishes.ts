import { create } from "zustand";
import { IdentifierBuilder } from "../utils/encryption";
import { QortalGetMetadata } from "../types/interfaces/resources";
import { TemporaryResource } from "../hooks/useResources";



interface PublishState {
  publishes: Record<string, TemporaryResource> ;
 
  getPublish: (qortalGetMetadata: QortalGetMetadata | null)  => TemporaryResource | null;
  setPublish: (qortalGetMetadata: QortalGetMetadata, data: TemporaryResource) => void;
}

// ✅ Typed Zustand Store
export const usePublishStore = create<PublishState>((set, get) => ({
    publishes: {},
    getPublish: (qortalGetMetadata) => {
        if(qortalGetMetadata === null) return null
        const cache = get().publishes[`${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`];
        if (cache) {
          return cache
        }
        return null;
      },
      setPublish: (qortalGetMetadata, data) =>
        set((state) => {
          return {
            publishes: {
              ...state.publishes,
              [`${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`]: data,
            },
          };
        }),
}));
