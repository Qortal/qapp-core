import { create } from 'zustand';
import { ResourceToPublish } from '../types/qortalRequests/types';
import { QortalGetMetadata, Service } from '../types/interfaces/resources';


interface MultiplePublishState {
  resources: ResourceToPublish[];
  failedResources: QortalGetMetadata[];
  isPublishing: boolean;
  resolveCallback?: (result: QortalGetMetadata[]) => void;
  rejectCallback?: (error: Error) => void;

  setPublishResources: (resources: ResourceToPublish[]) => void;
  setFailedPublishResources: (resources: QortalGetMetadata[]) => void;
  setIsPublishing: (value: boolean) => void;
  setCompletionResolver: (resolver: (result: QortalGetMetadata[]) => void) => void;
  setRejectionResolver: (resolver: (reject: Error) => void) => void;
  complete: (result: any) => void;
  reject: (Error: Error) => void;
  reset: () => void;
  setError: (message: string | null)=> void
  error: string | null
  isLoading: boolean
  setIsLoading: (val: boolean)=> void
}

const initialState = {
  resources: [],
  failedResources: [],
  isPublishing: false,
  resolveCallback: undefined,
  rejectCallback: undefined,
  error: "",
  isLoading: false
};

export const useMultiplePublishStore = create<MultiplePublishState>((set, get) => ({
  ...initialState,

  setPublishResources: (resources) => {
    set({ resources, isPublishing: true });
  },
 setFailedPublishResources: (resources) => {
    set({ failedResources: resources });
  },
  setIsPublishing: (value) => {
    set({ isPublishing: value });
  },
  setIsLoading: (value) => {
    set({ isLoading: value });
  },
  setCompletionResolver: (resolver) => {
    set({ resolveCallback: resolver });
  },
setRejectionResolver: (reject) => {
    set({ rejectCallback: reject });
  },
  complete: (result) => {
    const resolver = get().resolveCallback;
    if (resolver) resolver(result);
    set({ resolveCallback: undefined, isPublishing: false });
  },
    reject: (result) => {
    const resolver = get().rejectCallback;
    if (resolver) resolver(result);
    set({ resolveCallback: undefined, isPublishing: false });
  },
  setError: (message) => {
    set({ error: message });
  },

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
  error?: {
    reason: string
  }
  retry: boolean
  filename: string
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
      retry: false
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