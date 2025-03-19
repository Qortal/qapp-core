import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePublishStore } from "../state/publishes";
import { QortalGetMetadata } from "../types/interfaces/resources";
import { base64ToObject, retryTransaction } from "../utils/publish";


export const usePublish = (
  maxFetchTries: number = 3,
  returnType: "PUBLIC_JSON" = "PUBLIC_JSON",
  metadata?: QortalGetMetadata
) => {
  const hasFetched = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const publish = usePublishStore().getPublish(metadata || null);
  const setPublish = usePublishStore().setPublish;
  const [hasResource, setHasResource] = useState<boolean | null>(null)
  const fetchRawData = useCallback(async (item: QortalGetMetadata) => {
    const url = `/arbitrary/${item?.service}/${item?.name}/${item?.identifier}?encoding=base64`;
    const res = await fetch(url);
    const data = await res.text();
    return base64ToObject(data);
  }, []);

  const fetchPublish = useCallback(
    async (metadataProp: QortalGetMetadata, returnTypeProp: "PUBLIC_JSON" = "PUBLIC_JSON") => {
      let resourceExists = null;
      let resource = null;
      let error = null;
      try {
        if (metadata) {
          setIsLoading(true);
        }
        const url = `/arbitrary/resources/search?mode=ALL&service=${metadataProp?.service}&limit=1&includemetadata=true&reverse=true&excludeblocked=true&name=${metadataProp?.name}&exactmatchnames=true&offset=0&identifier=${metadataProp?.identifier}`;
        const responseMetadata = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!responseMetadata?.ok) return false;
        const resMetadata = await responseMetadata.json();
        if (resMetadata?.length === 0) {
          resourceExists = false;
          setHasResource(false)
        } else {
            resourceExists = true
            setHasResource(true)
          const response = await retryTransaction(
            fetchRawData,
            [metadataProp],
            true,
            maxFetchTries
          );
          const fullData = {
            qortalMetadata: resMetadata[0],
            data: response,
          };
          if (metadata) {
            setPublish(resMetadata[0], fullData);
          }
          resource = {
            qortalMetadata: resMetadata[0],
            data: response,
          };
        }
      } catch (error: any) {
        setError(error?.message);
        if (!metadata) {
          error = error?.message;
        }
      } finally {
        if (metadata) {
          setIsLoading(false);
        }
      }
      return {
        resourceExists,
        resource,
        error,
      };
    },
    [metadata]
  );

  useEffect(() => {
    if (hasFetched.current) return;
    if (metadata?.identifier && metadata?.name && metadata?.service) {
      hasFetched.current = true;
      fetchPublish(metadata, returnType);
    }
  }, [metadata, returnType]);

  if (!metadata)
    return {
      fetchPublish,
    };
  return {
    isLoading,
    error,
    resource: publish || null,
    hasResource,
    refetch: fetchPublish,
    fetchPublish,
  };
};
