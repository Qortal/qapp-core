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

export interface PeerDetail {
  id: string;
  speed: 'HIGH' | 'LOW' | 'IDLE';
  isDirect: boolean;
}

export interface ResourceStatus {
  status: Status;
  localChunkCount: number;
  totalChunkCount: number;
  percentLoaded: number;
  path?: string;
  filename?: string;
  numberOfPeers?: number;
  peers?: PeerDetail[];
  estimatedTimeRemaining?: number; // in seconds
  downloadSpeed?: number; // in percentage per second
}

interface GlobalDownloadEntry {
  interval: ReturnType<typeof setInterval> | null;
  timeout: ReturnType<typeof setTimeout> | null;
  retryTimeout: ReturnType<typeof setTimeout> | null;
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
    const retryTimeoutMap: Record<string, any> = {};
    const statusMap: Record<string, ResourceStatus | null> = {};
    const calledBuildMap: Record<string, boolean> = {};

    statusMap[resourceId] = getResourceStatus(resourceId);

    let isCalling = false;
    let percentLoaded = 0;
    let timer = 14;
    let tries = 0;
    let calledFirstTime = false;
    let isPaused = false;
    
    // Track progress for ETA calculation
    let progressHistory: Array<{ percent: number; timestamp: number }> = [];
    let lastProgressUpdate = Date.now();

    // Track maximum peers seen and chunk download speed
    let maxPeersSeen = 0;
    let chunkHistory: Array<{ chunks: number; timestamp: number }> = [];
    let baselineSpeed: number | null = null; // chunks per second
    let hasDetectedSlowdown = false; // Prevent multiple restarts

    const calculateETA = (currentPercent: number) => {
      const now = Date.now();
      
      // Add current progress to history
      progressHistory.push({ percent: currentPercent, timestamp: now });
      
      // Keep only last 6 data points (30 seconds of data at 5-second intervals)
      if (progressHistory.length > 6) {
        progressHistory = progressHistory.slice(-6);
      }
      
      // Need at least 2 data points to calculate speed
      if (progressHistory.length < 2) {
        return undefined;
      }
      
      // Calculate average speed from history
      const firstPoint = progressHistory[0];
      const lastPoint = progressHistory[progressHistory.length - 1];
      const percentDiff = lastPoint.percent - firstPoint.percent;
      const timeDiff = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // in seconds
      
      // If no progress or negative progress, return undefined
      if (percentDiff <= 0 || timeDiff <= 0) {
        return undefined;
      }
      
      const speed = percentDiff / timeDiff; // percent per second
      const remainingPercent = 100 - currentPercent;
      
      if (speed <= 0.001) {
        // Very slow or stalled
        return undefined;
      }
      
      const estimatedSeconds = remainingPercent / speed;
      
      // Cap at reasonable maximum (1 hour)
      return Math.min(estimatedSeconds, 3600);
    };

    const calculateChunkSpeed = (currentChunks: number, totalChunks: number) => {
      const now = Date.now();
      
      // Add current chunk count to history
      chunkHistory.push({ chunks: currentChunks, timestamp: now });
      
      // Keep only last 6 data points (30 seconds of data at 5-second intervals)
      if (chunkHistory.length > 6) {
        chunkHistory = chunkHistory.slice(-6);
      }
      console.log('chunkHistory (after slice)', chunkHistory);
      
      // Need at least 2 data points to calculate speed
      if (chunkHistory.length < 2) {
        return null;
      }
      
      const firstPoint = chunkHistory[0];
      const lastPoint = chunkHistory[chunkHistory.length - 1];
      const chunkDiff = lastPoint.chunks - firstPoint.chunks;
      const timeDiff = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // in seconds
      
      console.log('Speed calc:', { chunkDiff, timeDiff, firstChunks: firstPoint.chunks, lastChunks: lastPoint.chunks });
      
      if (timeDiff <= 0) {
        return null;
      }
      
      // If no progress, return 0 (stalled) instead of null
      // This allows slowdown detection to work when chunks are stuck
      if (chunkDiff <= 0) {
        // If we have enough history and no progress, it's stalled
        if (chunkHistory.length >= 4) {
          console.log('STALLED DETECTED: chunkDiff <= 0 with enough history');
          return 0; // Return 0 to indicate stalled, not null
        }
        return null;
      }
      
      const speed = chunkDiff / timeDiff; // chunks per second
      
      // Set baseline speed on first valid measurement (after we have enough data)
      if (baselineSpeed === null && chunkHistory.length >= 4) {
        baselineSpeed = speed;
        console.log('Baseline speed set:', baselineSpeed);
        return speed;
      }
      
      console.log('Current speed:', speed, 'Baseline:', baselineSpeed);
      return speed;
    };

    const checkForSlowdown = (currentChunks: number, totalChunks: number, numberOfPeers: number) => {
      // Update max peers seen
      if (numberOfPeers > maxPeersSeen) {
        maxPeersSeen = numberOfPeers;
      }
      console.log('checkForSlowdown:', { maxPeersSeen, hasDetectedSlowdown, currentChunks, totalChunks });
      
      // Only check for slowdown if we had more than 1 peer at some point
      if (maxPeersSeen <= 1) {
        console.log('Skipping: maxPeersSeen <= 1');
        return false;
      }
      
      // Don't restart multiple times
      if (hasDetectedSlowdown) {
        console.log('Skipping: already detected slowdown');
        return false;
      }
      
      // Need at least some progress to detect slowdown
      if (currentChunks === 0 || totalChunks === 0) {
        console.log('Skipping: no chunks or total');
        return false;
      }
      
      const currentSpeed = calculateChunkSpeed(currentChunks, totalChunks);
      console.log('currentSpeed:', currentSpeed, 'baselineSpeed:', baselineSpeed);
      
      // Handle stalled downloads (speed === 0) - this is definitely a slowdown
      if (currentSpeed === 0 && baselineSpeed !== null && chunkHistory.length >= 4) {
        console.log('Download stalled - no chunk progress detected');
        return true;
      }
      
      if (currentSpeed === null || baselineSpeed === null) {
        console.log('Skipping: currentSpeed or baselineSpeed is null');
        return false;
      }
      
      // Calculate slowdown threshold relative to total chunks
      // If we have many chunks, we expect slower absolute speed, so normalize
      const normalizedBaseline = baselineSpeed / totalChunks; // baseline speed as fraction of total per second
      const normalizedCurrent = currentSpeed / totalChunks; // current speed as fraction of total per second
      
      console.log('Normalized speeds:', { normalizedBaseline, normalizedCurrent });
      
      // Detect slowdown: current speed is less than 50% of baseline
      // This means download has slowed down significantly
      const slowdownThreshold = 0.5;
      const hasSlowdown = normalizedCurrent < (normalizedBaseline * slowdownThreshold);
      
      // Also check if speed is very slow relative to total chunks
      // If we're downloading less than 0.1% of total chunks per second, consider it slow
      const absoluteSlowThreshold = 0.001; // 0.1% of total chunks per second
      const isVerySlow = normalizedCurrent < absoluteSlowThreshold;
      
      console.log('Slowdown checks:', { hasSlowdown, isVerySlow });
      
      return hasSlowdown || isVerySlow;
    };

    const callFunction = async (build?: boolean, isRecalling?: boolean) => {
      try {
        // Prevent concurrent calls - check BEFORE setting isCalling
        if (isCalling) {
          console.debug(`[${resourceId}] Already calling, skipping concurrent request`);
          return;
        }
        
        // Don't start a new call if paused (unless it's a build call)
        if (isPaused && !build) {
          console.debug(`[${resourceId}] Paused, skipping call`);
          return;
        }
        
        isCalling = true;
        statusMap[resourceId] = getResourceStatus(resourceId);

        if (statusMap[resourceId]?.status === 'READY') {
          if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
          if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
          if (retryTimeoutMap[resourceId]) clearTimeout(retryTimeoutMap[resourceId]);
          intervalMap[resourceId] = null;
          timeoutMap[resourceId] = null;
          retryTimeoutMap[resourceId] = null;
          stopGlobalDownload(resourceId);
          isCalling = false; // Reset before early return
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

          // Fetch number of peers non-blocking
          fetch(
            `/arbitrary/resource/request/peers/${service}/${name}/${identifier}`
          )
            .then((response) => response.json())
            .then((peersData) => {
              const numberOfPeers = peersData?.peerCount ?? 0;
              const peers: PeerDetail[] = peersData?.peers ?? [];
              const currentStatus = getResourceStatus(resourceId);
              if (currentStatus) {
                setResourceStatus(
                  { service, name, identifier },
                  {
                    ...currentStatus,
                    numberOfPeers,
                    peers,
                  }
                );
                
                // Check for slowdown and call async fetch if needed
                if (
                  currentStatus.localChunkCount !== undefined &&
                  currentStatus.totalChunkCount !== undefined &&
                  (currentStatus.status === 'DOWNLOADING' || currentStatus.status === 'MISSING_DATA')
                ) {
                  const shouldRequestAsync = checkForSlowdown(
                    currentStatus.localChunkCount,
                    currentStatus.totalChunkCount,
                    numberOfPeers
                  );
                  console.log('shouldRequestAsync', shouldRequestAsync);
                  if (shouldRequestAsync) {
                    hasDetectedSlowdown = true;
                    console.log(`Download slowdown detected. Requesting async fetch for ${resourceId}`);
                    
                    // Call the async fetch request
                    const url = `/arbitrary/${service}/${name}/${identifier}?async=true`;
                    requestQueueBuildFile.enqueue(() =>
                      fetch(url, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                      })
                    ).catch((error) => {
                      console.debug('Failed to fetch async on slowdown:', error);
                    });
                  }
                }
              }
            })
            .catch((error) => {
              // Silently fail - don't block on peers fetch
              console.debug('Failed to fetch peers count:', error);
            });

          if (tries > retryAttempts) {
            if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
            if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
            if (retryTimeoutMap[resourceId]) clearTimeout(retryTimeoutMap[resourceId]);
            intervalMap[resourceId] = null;
            timeoutMap[resourceId] = null;
            retryTimeoutMap[resourceId] = null;
            stopGlobalDownload(resourceId);
            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
                status: 'FAILED_TO_DOWNLOAD',
              }
            );
            isCalling = false; // Reset before early return
            return;
          }
        }

        if (build || (calledFirstTime === false && res?.status !== 'READY')) {
          calledFirstTime = true;
          // isCalling is already true from the start of the function
          const url = `/arbitrary/${service}/${name}/${identifier}?async=true`;
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
            // Calculate ETA
            const eta = calculateETA(res.percentLoaded);
            
            if (
              res.percentLoaded === percentLoaded &&
              res.percentLoaded !== 100
            ) {
              timer -= 5;
            } else {
              timer = 14;
            }

            if (timer < 0) {
              timer = 14;
              // Keep isCalling true during pause
              isPaused = true;
              tries += 1;
              setResourceStatus(
                { service, name, identifier },
                {
                  ...res,
                  status: 'REFETCHING',
                  estimatedTimeRemaining: eta,
                }
              );

              timeoutMap[resourceId] = setTimeout(() => {
                callFunction(true, true);
              }, 200);

              isCalling = false; // Reset before early return
              return;
            }

            percentLoaded = res.percentLoaded;
            
            // Update status with ETA
            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
                estimatedTimeRemaining: eta,
              }
            );
          } else {
            setResourceStatus({ service, name, identifier }, { ...res });
          }
        }

        if (res?.status === 'READY') {
          if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
          if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
          if (retryTimeoutMap[resourceId]) clearTimeout(retryTimeoutMap[resourceId]);
          intervalMap[resourceId] = null;
          timeoutMap[resourceId] = null;
          retryTimeoutMap[resourceId] = null;
          stopGlobalDownload(resourceId);
          setResourceStatus({ service, name, identifier }, { ...res });
          isCalling = false; // Reset before early return
          return;
        }

        if (res?.status === 'DOWNLOADED') {
          // Only call build once for DOWNLOADED status
          if (!calledBuildMap[resourceId]) {
            calledBuildMap[resourceId] = true;

            try {
              res = await qortalRequest({
                action: 'GET_QDN_RESOURCE_STATUS',
                name: name,
                service: service,
                identifier: identifier,
                build: true,
              });
              // Update status with the build result
              setResourceStatus({ service, name, identifier }, { ...res });
  
              if(res?.status === 'READY') {
                // cleanup
                if (intervalMap[resourceId]) clearInterval(intervalMap[resourceId]);
                if (timeoutMap[resourceId]) clearTimeout(timeoutMap[resourceId]);
                if (retryTimeoutMap[resourceId]) clearTimeout(retryTimeoutMap[resourceId]);
                intervalMap[resourceId] = null;
                timeoutMap[resourceId] = null;
                retryTimeoutMap[resourceId] = null;
                stopGlobalDownload(resourceId);
                setResourceStatus({ service, name, identifier }, { ...res });
                isCalling = false; // Reset before early return
                return;
              }
            } catch (error) {
              console.error('Error during build request:', error);
            } finally {
              calledBuildMap[resourceId] = false;
            }
          

           
          }
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
          retryTimeout: retryTimeoutMap[resourceId],
        },
      },
    }));
  },

  stopGlobalDownload: (resourceId) => {
    const entry = get().globalDownloads[resourceId];
    if (entry) {
      if (entry.interval !== null) clearInterval(entry.interval);
      if (entry.timeout !== null) clearTimeout(entry.timeout);
      if (entry.retryTimeout !== null) clearTimeout(entry.retryTimeout);
      set((state) => {
        const updated = { ...state.globalDownloads };
        delete updated[resourceId];
        return { globalDownloads: updated };
      });
    }
  },
}));
