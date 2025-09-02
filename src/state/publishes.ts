import { create } from 'zustand';
import { QortalGetMetadata, Service } from '../types/interfaces/resources';
import { Resource } from '../hooks/useResources';
import { RequestQueueWithPromise } from '../utils/queue';

export const requestQueueBuildFile = new RequestQueueWithPromise(1);
export const requestQueueStatusFile = new RequestQueueWithPromise(2);

interface PublishCache {
  data: Resource | null;
  expiry: number;
}

export type Status =
  | 'BLOCKED'
  | 'BUILD_FAILED'
  | 'BUILDING'
  | 'DOWNLOADED'
  | 'DOWNLOADING'
  | 'FAILED_TO_DOWNLOAD'
  | 'INITIAL'
  | 'MISSING_DATA'
  | 'NOT_PUBLISHED'
  | 'PUBLISHED'
  | 'READY'
  | 'REFETCHING'
  | 'SEARCHING'
  | 'UNSUPPORTED';

export interface ResourceStatus {
  status: Status;
  localChunkCount: number;
  totalChunkCount: number;
  percentLoaded: number;
  path?: string;
  filename?: string;
}

interface GlobalDownloadEntry {
  interval: ReturnType<typeof setInterval> | null;
  timeout: ReturnType<typeof setTimeout> | null;
}

interface ResourceStatusEntry {
  id: string;
  metadata: QortalGetMetadata;
  status: ResourceStatus;
  path?: string;
  filename?: string;
}
interface PublishState {
  publishes: Record<string, PublishCache>;
  resourceStatus: Record<string, ResourceStatus | null>;
  setResourceStatus: (
    qortalGetMetadata: QortalGetMetadata,
    data: ResourceStatus | null
  ) => void;
  getPublish: (
    qortalGetMetadata: QortalGetMetadata | null,
    ignoreExpire?: boolean
  ) => Resource | null;
  getResourceStatus: (resourceId: string | null) => ResourceStatus | null;
  setPublish: (
    qortalGetMetadata: QortalGetMetadata,
    data: Resource | null,
    customExpiry?: number
  ) => void;
  clearExpiredPublishes: () => void;
  publishExpiryDuration: number; // Default expiry duration
  getAllResourceStatus: () => ResourceStatusEntry[];
  startGlobalDownload: (
    resourceId: string,
    metadata: QortalGetMetadata,
    retryAttempts: number,
    path?: string,
    filename?: string
  ) => void;
  stopGlobalDownload: (resourceId: string) => void;
  globalDownloads: Record<string, GlobalDownloadEntry>;
}

export const usePublishStore = create<PublishState>((set, get) => ({
  resourceStatus: {},
  publishes: {},
  globalDownloads: {},
  publishExpiryDuration: 5 * 60 * 1000, // Default expiry: 5 minutes

  getPublish: (qortalGetMetadata, ignoreExpire = false) => {
    if (!qortalGetMetadata) return null;

    const id = `${qortalGetMetadata.service}-${qortalGetMetadata.name}-${qortalGetMetadata.identifier}`;
    const cache = get().publishes[id];

    if (cache) {
      if (cache.expiry > Date.now() || ignoreExpire) {
        if (cache?.data?.qortalMetadata?.size === 32) return null;
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
        [id]: !data
          ? null
          : {
              ...existingData,
              ...data,
            },
      },
    }));
  },
  getResourceStatus: (resourceId) => {
    if (!resourceId) return null;
    const status = get().resourceStatus[resourceId];
    if (!status) return null;

    const { path, filename, ...rest } = status;
    return rest;
  },
  clearExpiredPublishes: () => {
    set((state) => {
      const now = Date.now();
      const updatedPublishes = Object.fromEntries(
        Object.entries(state.publishes).filter(
          ([_, cache]) => cache.expiry > now
        )
      );
      return { publishes: updatedPublishes };
    });
  },
  getAllResourceStatus: () => {
    const { resourceStatus } = get();

    return Object.entries(resourceStatus)
      .filter(([_, status]) => status !== null)
      .map(([id, status]) => {
        const parts = id.split('-');
        const service = parts[0] as Service;
        const name = parts[1] || '';
        const identifier = parts.length > 2 ? parts.slice(2).join('-') : '';

        const { path, filename, ...rest } = status!; // extract path from old ResourceStatus

        return {
          id,
          metadata: {
            service,
            name,
            identifier,
          },
          status: rest,
          path,
          filename,
        };
      });
  },
  startGlobalDownload: (
    resourceId,
    metadata,
    retryAttempts,
    path,
    filename
  ) => {
    if (get().globalDownloads[resourceId]) return;

    const { service, name, identifier } = metadata;
    const setResourceStatus = get().setResourceStatus;
    const stopGlobalDownload = get().stopGlobalDownload;
    const getResourceStatus = get().getResourceStatus;

    const intervalMap: Record<string, any> = {};
    const timeoutMap: Record<string, any> = {};
    const statusMap: Record<string, ResourceStatus | null> = {};

    statusMap[resourceId] = getResourceStatus(resourceId);

    let isCalling = false;
    let percentLoaded = 0;
    let timer = 29;
    let tries = 0;
    let calledFirstTime = false;
    let isPaused = false;
    const callFunction = async (build?: boolean, isRecalling?: boolean) => {
      try {
        if ((isCalling || isPaused) && !build) return;
        isCalling = true;
        statusMap[resourceId] = getResourceStatus(resourceId);

        if (statusMap[resourceId]?.status === 'READY') {
          if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
          if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
          intervalMap[resourceId] = null;
          timeoutMap[resourceId] = null;
          stopGlobalDownload(resourceId);
          return;
        }

        if (!isRecalling) {
          setResourceStatus(
            { service, name, identifier },
            {
              status: 'SEARCHING',
              localChunkCount: 0,
              totalChunkCount: 0,
              percentLoaded: 0,
              path: path || '',
              filename: filename || '',
            }
          );
        }

        let res;

        if (!build) {
          res = await requestQueueStatusFile.enqueue(() =>
            qortalRequest({
              action: 'GET_QDN_RESOURCE_STATUS',
              name: name,
              service: service,
              identifier: identifier,
            })
          );
          // res = await resCall.json();
          setResourceStatus({ service, name, identifier }, { ...res });

          if (tries > retryAttempts) {
            if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
            if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
            intervalMap[resourceId] = null;
            timeoutMap[resourceId] = null;
            stopGlobalDownload(resourceId);
            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
                status: 'FAILED_TO_DOWNLOAD',
              }
            );
            return;
          }
        }

        if (build || (calledFirstTime === false && res?.status !== 'READY')) {
          calledFirstTime = true;
          isCalling = true;
          const url = `/arbitrary/resource/properties/${service}/${name}/${identifier}?build=true`;
          // const resCall = await fetch(url, {
          //   method: "GET",
          //   headers: { "Content-Type": "application/json" },
          // });
          const resCall = await requestQueueBuildFile.enqueue(() =>
            fetch(url, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            })
          );
          res = await resCall.json();
          isPaused = false;
        }

        if (res.localChunkCount) {
          if (res.percentLoaded) {
            if (
              res.percentLoaded === percentLoaded &&
              res.percentLoaded !== 100
            ) {
              timer -= 5;
            } else {
              timer = 29;
            }

            if (timer < 0) {
              timer = 29;
              isCalling = true;
              isPaused = true;
              tries += 1;
              setResourceStatus(
                { service, name, identifier },
                {
                  ...res,
                  status: 'REFETCHING',
                }
              );

              timeoutMap[resourceId] = setTimeout(() => {
                callFunction(true, true);
              }, 10000);

              return;
            }

            percentLoaded = res.percentLoaded;
          }

          setResourceStatus({ service, name, identifier }, { ...res });
        }

        if (res?.status === 'READY') {
          if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
          if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
          intervalMap[resourceId] = null;
          timeoutMap[resourceId] = null;
          stopGlobalDownload(resourceId);
          setResourceStatus({ service, name, identifier }, { ...res });
          return;
        }

        if (res?.status === 'DOWNLOADED') {
          res = await qortalRequest({
            action: 'GET_QDN_RESOURCE_STATUS',
            name: name,
            service: service,
            identifier: identifier,
            build: true,
          });
        }
      } catch (error) {
        console.error('Error during resource fetch:', error);
      } finally {
        isCalling = false;
      }
    };

    callFunction();

    intervalMap[resourceId] = setInterval(() => {
      callFunction(false, true);
    }, 5000);

    set((state) => ({
      globalDownloads: {
        ...state.globalDownloads,
        [resourceId]: {
          interval: intervalMap[resourceId],
          timeout: timeoutMap[resourceId],
        },
      },
    }));
  },

  stopGlobalDownload: (resourceId) => {
    const entry = get().globalDownloads[resourceId];
    if (entry) {
      if (entry.interval !== null) clearInterval(entry.interval);
      if (entry.timeout !== null) clearTimeout(entry.timeout);
      set((state) => {
        const updated = { ...state.globalDownloads };
        delete updated[resourceId];
        return { globalDownloads: updated };
      });
    }
  },
}));
