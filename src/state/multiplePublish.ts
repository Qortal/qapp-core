import { create } from 'zustand';
import { ResourceToPublish } from '../types/qortalRequests/types';
import { Service } from '../types/interfaces/resources';


interface MultiplePublishState {
  resources: ResourceToPublish[];
  setPublishResources: (resources: ResourceToPublish[])=> void
  reset: ()=> void
  isPublishing: boolean
}
  const initialState = {
    resources: [],
    isPublishing: false
  };
export const useMultiplePublishStore = create<MultiplePublishState>((set) => ({
  ...initialState,
  setPublishResources: (resources: ResourceToPublish[]) => set(() => ({ resources, isPublishing: true })),
  reset: () => set(initialState),

}));

export type PublishLocation = {
  name: string;
  identifier: string;
  service: Service;
};

export type PublishStatus = {
  publishLocation: PublishLocation;
  chunks: number;
  totalChunks: number;
  processed: boolean;
};

type PublishStatusStore = {
  publishStatus: Record<string, PublishStatus>;
  getPublishStatusByKey: (key: string) => PublishStatus | undefined;
  setPublishStatusByKey: (key: string, update: Partial<PublishStatus>) => void;
};


export const usePublishStatusStore = create<PublishStatusStore>((set, get) => ({
  publishStatus: {},

  getPublishStatusByKey: (key) => get().publishStatus[key],

  setPublishStatusByKey: (key, update) => {
    const current = get().publishStatus;

    const prev: PublishStatus = current[key] ?? {
      publishLocation: {
        name: '',
        identifier: '',
        service: 'DOCUMENT',
        processed: false,
      },
      chunks: 0,
      totalChunks: 0,
      processed: false,
    };

    const newStatus: PublishStatus = {
      ...prev,
      ...update,
      publishLocation: {
        ...prev.publishLocation,
        ...(update.publishLocation ?? {}),
      },
    };

    set({
      publishStatus: {
        ...current,
        [key]: newStatus,
      },
    });
  },
}));