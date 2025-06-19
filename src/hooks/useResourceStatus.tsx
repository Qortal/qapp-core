import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ResourceStatus, usePublishStore } from "../state/publishes";
import { QortalGetMetadata } from "../types/interfaces/resources";

interface PropsUseResourceStatus {
  resource: QortalGetMetadata | null;
  retryAttempts?: number;
}
export const useResourceStatus = ({
  resource,
  retryAttempts = 200,
}: PropsUseResourceStatus) => {
  const resourceId = !resource ? null : `${resource.service}-${resource.name}-${resource.identifier}`;
  const status = usePublishStore((state)=> state.getResourceStatus(resourceId)) || null
  const intervalRef = useRef<any>(null)
  const timeoutRef = useRef<any>(null)
  const setResourceStatus = usePublishStore((state) => state.setResourceStatus);
  const statusRef = useRef<ResourceStatus | null>(null)

  useEffect(()=> {
    statusRef.current = status
  }, [status])
  const downloadResource = useCallback(
    ({ service, name, identifier }: QortalGetMetadata, build?: boolean) => {
      try {
        if(statusRef.current && statusRef.current?.status === 'READY'){
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          return
        }
        setResourceStatus(
            { service, name, identifier },
            {
             "status": "SEARCHING",
            "localChunkCount": 0,
            "totalChunkCount": 0,
            "percentLoaded": 0
            }
          );
        let isCalling = false;
        let percentLoaded = 0;
        let timer = 24;
        let tries = 0;
        let calledFirstTime = false;
        const callFunction = async () => {
          if (isCalling) return;
          isCalling = true;

          let res;
          if (!build) {
            const urlFirstTime = `/arbitrary/resource/status/${service}/${name}/${identifier}`;
            const resCall = await fetch(urlFirstTime, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            res = await resCall.json();
            setResourceStatus(
                { service, name, identifier },
                {
                  ...res
                }
              );
            if (tries > retryAttempts) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
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
                timer = 24;
              }

              if (timer < 0) {
                timer = 24;
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
                  downloadResource({ name, service, identifier }, true);
                }, 25000);

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
            setResourceStatus({service, name, identifier}, {
                ...res,
            })
          }
          if (res?.status === "DOWNLOADED") {
            const url = `/arbitrary/resource/status/${service}/${name}/${identifier}?build=true`;
            const resCall = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            res = await resCall.json();
          }
        };
        callFunction();
        intervalRef.current = setInterval(async () => {
          callFunction();
        }, 5000);
      } catch (error) {
        console.error("Error during resource fetch:", error);
      }
    },
    [retryAttempts]
  );
  useEffect(() => {
    if (resource?.identifier && resource?.name && resource?.service) {
      downloadResource({
        service: resource?.service,
        name: resource?.name,
        identifier: resource?.identifier,
      });
    }
    return ()=> {
        if(intervalRef.current){
            clearInterval(intervalRef.current)
        }
        if(timeoutRef.current){
            clearTimeout(timeoutRef.current)
        }
    }
  }, [
    resource?.identifier,
    resource?.name,
    resource?.service,
    downloadResource,
  ]);

  const resourceUrl = resource ? `/arbitrary/${resource.service}/${resource.name}/${resource.identifier}` : null;

  return useMemo(() => ({
    status: status?.status || "INITIAL",
    localChunkCount: status?.localChunkCount || 0,
    totalChunkCount: status?.totalChunkCount || 0,
    percentLoaded: status?.percentLoaded || 0,
    isReady: status?.status === 'READY',
    resourceUrl,
  }), [status?.status, status?.localChunkCount, status?.totalChunkCount, status?.percentLoaded, resourceUrl]);
   
};
