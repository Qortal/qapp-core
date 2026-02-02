import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ResourceStatus, usePublishStore, requestQueueBuildFile, requestQueueStatusFile, PeerDetail } from '../state/publishes';
import { QortalGetMetadata } from '../types/interfaces/resources';

interface PropsUseResourceStatus {
  resource: QortalGetMetadata | null;
  retryAttempts?: number;
  path?: string;
  filename?: string;
  isGlobal?: boolean;
  disableAutoFetch?: boolean;
}
export const useResourceStatus = ({
  resource,
  retryAttempts = 40,
  path,
  filename,
  isGlobal,
  disableAutoFetch,
}: PropsUseResourceStatus) => {
  const resourceId = !resource
    ? null
    : `${resource.service}-${resource.name}-${resource.identifier}`;
  const status =
    usePublishStore((state) => state.getResourceStatus(resourceId)) || null;
  const intervalRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const setResourceStatus = usePublishStore((state) => state.setResourceStatus);
  const getResourceStatus = usePublishStore((state) => state.getResourceStatus);

  const statusRef = useRef<ResourceStatus | null>(null);
  const isCallingRef = useRef<boolean>(false);
  const percentLoadedRef = useRef<number>(0);
  const timerRef = useRef<number>(14);
  const triesRef = useRef<number>(0);
  const calledFirstTimeRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const calledBuildRef = useRef<boolean>(false);
  
  // Track progress for ETA calculation
  const progressHistoryRef = useRef<Array<{ percent: number; timestamp: number }>>([]);
  
  // Track maximum peers seen and chunk download speed
  const maxPeersSeenRef = useRef<number>(0);
  const chunkHistoryRef = useRef<Array<{ chunks: number; timestamp: number }>>([]);
  const baselineSpeedRef = useRef<number | null>(null);
  const hasDetectedSlowdownRef = useRef<boolean>(false);
  
  const startGlobalDownload = usePublishStore(
    (state) => state.startGlobalDownload
  );
  const stopGlobalDownload = usePublishStore(
    (state) => state.stopGlobalDownload
  );
  
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  const calculateETA = useCallback((currentPercent: number) => {
    const now = Date.now();
    
    // Add current progress to history
    progressHistoryRef.current.push({ percent: currentPercent, timestamp: now });
    
    // Keep only last 6 data points (30 seconds of data at 5-second intervals)
    if (progressHistoryRef.current.length > 6) {
      progressHistoryRef.current = progressHistoryRef.current.slice(-6);
    }
    
    // Need at least 2 data points to calculate speed
    if (progressHistoryRef.current.length < 2) {
      return undefined;
    }
    
    // Calculate average speed from history
    const firstPoint = progressHistoryRef.current[0];
    const lastPoint = progressHistoryRef.current[progressHistoryRef.current.length - 1];
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
  }, []);

  const calculateChunkSpeed = useCallback((currentChunks: number, totalChunks: number) => {
    const now = Date.now();
    
    // Add current chunk count to history
    chunkHistoryRef.current.push({ chunks: currentChunks, timestamp: now });
    
    // Keep only last 6 data points (30 seconds of data at 5-second intervals)
    if (chunkHistoryRef.current.length > 6) {
      chunkHistoryRef.current = chunkHistoryRef.current.slice(-6);
    }
    
    // Need at least 2 data points to calculate speed
    if (chunkHistoryRef.current.length < 2) {
      return null;
    }
    
    const firstPoint = chunkHistoryRef.current[0];
    const lastPoint = chunkHistoryRef.current[chunkHistoryRef.current.length - 1];
    const chunkDiff = lastPoint.chunks - firstPoint.chunks;
    const timeDiff = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // in seconds
    
    if (timeDiff <= 0) {
      return null;
    }
    
    // If no progress, return 0 (stalled) instead of null
    if (chunkDiff <= 0) {
      // If we have enough history and no progress, it's stalled
      if (chunkHistoryRef.current.length >= 4) {
        return 0; // Return 0 to indicate stalled
      }
      return null;
    }
    
    const speed = chunkDiff / timeDiff; // chunks per second
    
    // Set baseline speed on first valid measurement
    if (baselineSpeedRef.current === null && chunkHistoryRef.current.length >= 4) {
      baselineSpeedRef.current = speed;
      return speed;
    }
    
    return speed;
  }, []);

  const checkForSlowdown = useCallback((currentChunks: number, totalChunks: number, numberOfPeers: number) => {
    // Update max peers seen
    if (numberOfPeers > maxPeersSeenRef.current) {
      maxPeersSeenRef.current = numberOfPeers;
    }
    
    // Only check for slowdown if we had more than 1 peer at some point
    if (maxPeersSeenRef.current <= 1) {
      return false;
    }
    
    // Don't restart multiple times
    if (hasDetectedSlowdownRef.current) {
      return false;
    }
    
    // Need at least some progress to detect slowdown
    if (currentChunks === 0 || totalChunks === 0) {
      return false;
    }
    
    const currentSpeed = calculateChunkSpeed(currentChunks, totalChunks);
    
    // Handle stalled downloads (speed === 0)
    if (currentSpeed === 0 && baselineSpeedRef.current !== null && chunkHistoryRef.current.length >= 4) {
      console.log('Download stalled - no chunk progress detected');
      return true;
    }
    
    if (currentSpeed === null || baselineSpeedRef.current === null) {
      return false;
    }
    
    // Calculate slowdown threshold relative to total chunks
    const normalizedBaseline = baselineSpeedRef.current / totalChunks;
    const normalizedCurrent = currentSpeed / totalChunks;
    
    // Detect slowdown: current speed is less than 50% of baseline
    const slowdownThreshold = 0.5;
    const hasSlowdown = normalizedCurrent < (normalizedBaseline * slowdownThreshold);
    
    // Also check if speed is very slow relative to total chunks
    const absoluteSlowThreshold = 0.001; // 0.1% of total chunks per second
    const isVerySlow = normalizedCurrent < absoluteSlowThreshold;
    
    return hasSlowdown || isVerySlow;
  }, [calculateChunkSpeed]);
  
  const downloadResource = useCallback(
    (
      { service, name, identifier }: QortalGetMetadata,
      build?: boolean,
      isRecalling?: boolean
    ) => {
      try {
        if (statusRef.current && statusRef.current?.status === 'READY') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          intervalRef.current = null;
          timeoutRef.current = null;
          return;
        }
        if (!isRecalling) {
          const id = `${service}-${name}-${identifier}`;
          const resourceStatus = getResourceStatus(id);
          if (!resourceStatus) {
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
        }
        
        const callFunction = async () => {
          try {
            // Prevent concurrent calls
            if (isCallingRef.current) {
              console.debug(`[${service}-${name}-${identifier}] Already calling, skipping concurrent request`);
              return;
            }
            
            // Don't start a new call if paused (unless it's a build call)
            if (isPausedRef.current && !build) {
              console.debug(`[${service}-${name}-${identifier}] Paused, skipping call`);
              return;
            }
            
            isCallingRef.current = true;
            statusRef.current = getResourceStatus(`${service}-${name}-${identifier}`);

            if (statusRef.current?.status === 'READY') {
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              intervalRef.current = null;
              timeoutRef.current = null;
              isCallingRef.current = false;
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
              
              setResourceStatus({ service, name, identifier }, { ...res });

              // Fetch number of peers non-blocking
              fetch(
                `/arbitrary/resource/request/peers/${service}/${name}/${identifier}`
              )
                .then((response) => response.json())
                .then((peersData) => {
                  const numberOfPeers = peersData?.peerCount ?? 0;
                  const peers: PeerDetail[] = peersData?.peers ?? [];
                  const currentStatus = getResourceStatus(`${service}-${name}-${identifier}`);
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
                      if (shouldRequestAsync) {
                        hasDetectedSlowdownRef.current = true;
                        console.log(`Download slowdown detected. Requesting async fetch for ${service}-${name}-${identifier}`);
                        
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
                  console.debug('Failed to fetch peers count:', error);
                });

              if (triesRef.current > retryAttempts) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                intervalRef.current = null;
                timeoutRef.current = null;
                setResourceStatus(
                  { service, name, identifier },
                  {
                    ...res,
                    status: 'FAILED_TO_DOWNLOAD',
                  }
                );
                isCallingRef.current = false;
                return;
              }
            }

            if (build || (calledFirstTimeRef.current === false && res?.status !== 'READY')) {
              calledFirstTimeRef.current = true;
              const url = `/arbitrary/${service}/${name}/${identifier}?async=true`;
              const resCall = await requestQueueBuildFile.enqueue(() =>
                fetch(url, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                })
              );
              res = await resCall.json();
              isPausedRef.current = false;
            }

            if (res.localChunkCount) {
              if (res.percentLoaded) {
                // Calculate ETA
                const eta = calculateETA(res.percentLoaded);
                
                if (
                  res.percentLoaded === percentLoadedRef.current &&
                  res.percentLoaded !== 100
                ) {
                  timerRef.current -= 5;
                } else {
                  timerRef.current = 14;
                }

                if (timerRef.current < 0) {
                  timerRef.current = 14;
                  isPausedRef.current = true;
                  triesRef.current += 1;
                  setResourceStatus(
                    { service, name, identifier },
                    {
                      ...res,
                      status: 'REFETCHING',
                      estimatedTimeRemaining: eta,
                    }
                  );

                  timeoutRef.current = setTimeout(() => {
                    callFunction();
                  }, 200);

                  isCallingRef.current = false;
                  return;
                }

                percentLoadedRef.current = res.percentLoaded;
                
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
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              intervalRef.current = null;
              timeoutRef.current = null;
              setResourceStatus({ service, name, identifier }, { ...res });
              isCallingRef.current = false;
              return;
            }

            if (res?.status === 'DOWNLOADED') {
              // Only call build once for DOWNLOADED status
              if (!calledBuildRef.current) {
                calledBuildRef.current = true;

                try {
                  res = await qortalRequest({
                    action: 'GET_QDN_RESOURCE_STATUS',
                    name: name,
                    service: service,
                    identifier: identifier,
                    build: true,
                  });
                  setResourceStatus({ service, name, identifier }, { ...res });
      
                  if(res?.status === 'READY') {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    intervalRef.current = null;
                    timeoutRef.current = null;
                    setResourceStatus({ service, name, identifier }, { ...res });
                    isCallingRef.current = false;
                    return;
                  }
                } catch (error) {
                  console.error('Error during build request:', error);
                } finally {
                  calledBuildRef.current = false;
                }
              }
            }
          } catch (error) {
            console.error('Error during resource fetch:', error);
          } finally {
            isCallingRef.current = false;
          }
        };
        
        callFunction();

        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            callFunction();
          }, 5000);
        }
      } catch (error) {
        console.error('Error during resource fetch:', error);
      }
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    },
    [retryAttempts, path, filename, calculateETA, checkForSlowdown, setResourceStatus, getResourceStatus]
  );
  useEffect(() => {
    if (disableAutoFetch) return;
    if (resource?.identifier && resource?.name && resource?.service) {
      const id = `${resource.service}-${resource.name}-${resource.identifier}`;

      if (isGlobal) {
        startGlobalDownload(id, resource, retryAttempts, path, filename);
      } else {
        // Reset tracking refs for new downloads
        statusRef.current = null;
        isCallingRef.current = false;
        percentLoadedRef.current = 0;
        timerRef.current = 14;
        triesRef.current = 0;
        calledFirstTimeRef.current = false;
        isPausedRef.current = false;
        calledBuildRef.current = false;
        progressHistoryRef.current = [];
        maxPeersSeenRef.current = 0;
        chunkHistoryRef.current = [];
        baselineSpeedRef.current = null;
        hasDetectedSlowdownRef.current = false;
        
        downloadResource({
          service: resource?.service,
          name: resource?.name,
          identifier: resource?.identifier,
        });
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    resource?.identifier,
    resource?.name,
    resource?.service,
    downloadResource,
    isGlobal,
    retryAttempts,
    path,
    filename,
    disableAutoFetch,
    startGlobalDownload,
  ]);

  const handledownloadResource = useCallback(() => {
    if (resource?.identifier && resource?.name && resource?.service) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const id = `${resource?.service}-${resource?.name}-${resource?.identifier}`;
      const resourceStatus = getResourceStatus(id);
      if (!resourceStatus) {
        setResourceStatus(
          {
            service: resource.service,
            name: resource.name,
            identifier: resource.identifier,
          },
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
      if (isGlobal) {
        const id = `${resource.service}-${resource.name}-${resource.identifier}`;
        stopGlobalDownload(id);
        startGlobalDownload(id, resource, retryAttempts, path, filename);
      } else {
        // Reset tracking refs for new downloads
        isCallingRef.current = false;
        percentLoadedRef.current = 0;
        timerRef.current = 14;
        triesRef.current = 0;
        calledFirstTimeRef.current = false;
        isPausedRef.current = false;
        calledBuildRef.current = false;
        progressHistoryRef.current = [];
        maxPeersSeenRef.current = 0;
        chunkHistoryRef.current = [];
        baselineSpeedRef.current = null;
        hasDetectedSlowdownRef.current = false;
        
        downloadResource({
          service: resource?.service,
          name: resource?.name,
          identifier: resource?.identifier,
        });
      }
    }
  }, [
    resource?.identifier,
    resource?.name,
    resource?.service,
    downloadResource,
    isGlobal,
    retryAttempts,
    path,
    filename,
    stopGlobalDownload,
    startGlobalDownload,
    getResourceStatus,
    setResourceStatus,
  ]);

  const resourceUrl = resource
    ? `/arbitrary/${resource.service}/${resource.name}/${resource.identifier}`
    : null;

  return useMemo(
    () => ({
      status: status?.status || 'INITIAL',
      localChunkCount: status?.localChunkCount || 0,
      totalChunkCount: status?.totalChunkCount || 0,
      percentLoaded: status?.percentLoaded || 0,
      numberOfPeers: status?.numberOfPeers,
      peers: status?.peers,
      estimatedTimeRemaining: status?.estimatedTimeRemaining,
      isReady: status?.status === 'READY',
      resourceUrl,
      downloadResource: handledownloadResource,
    }),
    [
      status?.status,
      status?.localChunkCount,
      status?.totalChunkCount,
      status?.percentLoaded,
      status?.numberOfPeers,
      status?.peers,
      status?.estimatedTimeRemaining,
      resourceUrl,
      downloadResource,
    ]
  );
};
