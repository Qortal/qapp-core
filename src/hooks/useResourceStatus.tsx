import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ResourceStatus, usePublishStore } from "../state/publishes";
import { QortalGetMetadata } from "../types/interfaces/resources";

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
  const statusRef = useRef<ResourceStatus | null>(null);
  const startGlobalDownload = usePublishStore(
    (state) => state.startGlobalDownload
  );
  const stopGlobalDownload = usePublishStore(
    (state) => state.stopGlobalDownload
  );
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const downloadResource = useCallback(
    (
      { service, name, identifier }: QortalGetMetadata,
      build?: boolean,
      isRecalling?: boolean
    ) => {
      try {
        if (statusRef.current && statusRef.current?.status === "READY") {
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
          setResourceStatus(
            { service, name, identifier },
            {
              status: "SEARCHING",
              localChunkCount: 0,
              totalChunkCount: 0,
              percentLoaded: 0,
              path: path || "",
              filename: filename || "",
            }
          );
        }
        let isCalling = false;
        let percentLoaded = 0;
        let timer = 29;
        let tries = 0;
        let calledFirstTime = false;
        const callFunction = async () => {
          if (isCalling) return;
          isCalling = true;

          let res;
          if (!build) {
            res = await qortalRequest({
              action: "GET_QDN_RESOURCE_STATUS",
              name: name,
              service: service,
              identifier: identifier,
            });

            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
              }
            );
            if (tries > retryAttempts) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              intervalRef.current = null;
              timeoutRef.current = null;
              setResourceStatus(
                { service, name, identifier },
                {
                  ...res,
                  status: "FAILED_TO_DOWNLOAD",
                }
              );

              return;
            }
            tries = tries + 1;
          }

          if (build || (calledFirstTime === false && res?.status !== "READY")) {
            const url = `/arbitrary/resource/properties/${service}/${name}/${identifier}?build=true`;
            const resCall = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            res = await resCall.json();
          }
          calledFirstTime = true;
          isCalling = false;

          if (res.localChunkCount) {
            if (res.percentLoaded) {
              if (
                res.percentLoaded === percentLoaded &&
                res.percentLoaded !== 100
              ) {
                timer = timer - 5;
              } else {
                timer = 29;
              }

              if (timer < 0) {
                timer = 29;
                isCalling = true;

                setResourceStatus(
                  { service, name, identifier },
                  {
                    ...res,
                    status: "REFETCHING",
                  }
                );

                timeoutRef.current = setTimeout(() => {
                  isCalling = false;
                  downloadResource({ name, service, identifier }, true, true);
                }, 10000);

                return;
              }

              percentLoaded = res.percentLoaded;
            }

            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
              }
            );
          }
          // Check if progress is 100% and clear interval if true
          if (res?.status === "READY") {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            intervalRef.current = null;
            timeoutRef.current = null;
            setResourceStatus(
              { service, name, identifier },
              {
                ...res,
              }
            );
            return;
          }
          if (res?.status === "DOWNLOADED") {
            res = await qortalRequest({
              action: "GET_QDN_RESOURCE_STATUS",
              name: name,
              service: service,
              identifier: identifier,
              build: true,
            });
          }
        };
        callFunction();

        if (!intervalRef.current) {
          intervalRef.current = setInterval(callFunction, 5000);
        }
      } catch (error) {
        console.error("Error during resource fetch:", error);
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
    [retryAttempts]
  );
  useEffect(() => {
    if (disableAutoFetch) return;
    if (resource?.identifier && resource?.name && resource?.service) {
      const id = `${resource.service}-${resource.name}-${resource.identifier}`;

      if (isGlobal) {
        startGlobalDownload(id, resource, retryAttempts, path, filename);
      } else {
        statusRef.current = null;
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
      setResourceStatus(
        {
          service: resource.service,
          name: resource.name,
          identifier: resource.identifier,
        },
        {
          status: "SEARCHING",
          localChunkCount: 0,
          totalChunkCount: 0,
          percentLoaded: 0,
          path: path || "",
          filename: filename || "",
        }
      );
      if (isGlobal) {
        const id = `${resource.service}-${resource.name}-${resource.identifier}`;
        stopGlobalDownload(id);
        startGlobalDownload(id, resource, retryAttempts, path, filename);
      } else {
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
  ]);

  const resourceUrl = resource
    ? `/arbitrary/${resource.service}/${resource.name}/${resource.identifier}`
    : null;

  return useMemo(
    () => ({
      status: status?.status || "INITIAL",
      localChunkCount: status?.localChunkCount || 0,
      totalChunkCount: status?.totalChunkCount || 0,
      percentLoaded: status?.percentLoaded || 0,
      isReady: status?.status === "READY",
      resourceUrl,
      downloadResource: handledownloadResource,
    }),
    [
      status?.status,
      status?.localChunkCount,
      status?.totalChunkCount,
      status?.percentLoaded,
      resourceUrl,
      downloadResource,
    ]
  );
};
