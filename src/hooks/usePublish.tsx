import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePublishStore } from "../state/publishes";
import { QortalGetMetadata, QortalMetadata } from "../types/interfaces/resources";
import { base64ToObject, retryTransaction } from "../utils/publish";
import { useGlobal } from "../context/GlobalProvider";
import { ReturnType } from "../components/ResourceList/ResourceListDisplay";
import { useCacheStore } from "../state/cache";
import { useMultiplePublishStore, usePublishStatusStore } from "../state/multiplePublish";
import { ResourceToPublish } from "../types/qortalRequests/types";
import { MultiplePublishError } from "../components/MultiPublish/MultiPublishDialog";

interface StoredPublish {
    qortalMetadata: QortalMetadata;
    data: any;
    timestamp: number;
  }

  type UsePublishWithMetadata = {
    isLoading: boolean;
    error: string | null;
    resource: { qortalMetadata: QortalMetadata; data: any } | null;
    hasResource: boolean | null;
    refetch: () => Promise<{
      hasResource: boolean | null;
      resource: { qortalMetadata: QortalMetadata; data: any } | null;
      error: string | null;
    }>
    fetchPublish: (metadataProp: QortalGetMetadata, disableFetch?: boolean) => Promise<{
      hasResource: boolean | null;
      resource: { qortalMetadata: QortalMetadata; data: any } | null;
      error: string | null;
    }>;
    updatePublish: (publish: QortalGetMetadata, data: any) => Promise<void>;
    deletePublish: (publish: QortalGetMetadata) => Promise<boolean | undefined>;
    publishMultipleResources: (resources: ResourceToPublish[])=> Promise<Error | QortalGetMetadata[]>
  };
  
  type UsePublishWithoutMetadata = {
    fetchPublish: (metadataProp: QortalGetMetadata) => Promise<{
      hasResource: boolean | null;
      resource: { qortalMetadata: QortalMetadata; data: any } | null;
      error: string | null;
    }>;
    updatePublish: (publish: QortalGetMetadata, data: any) => Promise<void>;
    deletePublish: (publish: QortalGetMetadata) => Promise<boolean | undefined>;
    publishMultipleResources: (resources: ResourceToPublish[])=> Promise<Error | QortalGetMetadata[]>
    
  };

  export function usePublish(
    maxFetchTries: number,
    returnType: ReturnType,
    metadata: QortalGetMetadata,
    disableFetch?: boolean
  ): UsePublishWithMetadata;
  
  export function usePublish(
    maxFetchTries?: number,
    returnType?: ReturnType,
    metadata?: null
  ): UsePublishWithoutMetadata;
  
  // ✅ Actual implementation (must be a `function`, not `const`)
  export function usePublish(
    maxFetchTries: number = 3,
    returnType: ReturnType = "JSON",
    metadata?: QortalGetMetadata | null,
    disableFetch?: boolean
  ): UsePublishWithMetadata | UsePublishWithoutMetadata {
  const {auth, appInfo} = useGlobal()
  const username = auth?.name
  const appNameHashed = appInfo?.appNameHashed
  const hasFetched = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const publish = usePublishStore().getPublish(metadata || null, true);
  const setPublish = usePublishStore((state)=> state.setPublish)
  const getPublish = usePublishStore(state=> state.getPublish)
  const setResourceCache = useCacheStore((s) => s.setResourceCache);
  const markResourceAsDeleted = useCacheStore((s) => s.markResourceAsDeleted);
  const setPublishStatusByKey = usePublishStatusStore((s)=> s.setPublishStatusByKey)
   const setPublishResources = useMultiplePublishStore((state) => state.setPublishResources);
      const resetPublishResources = useMultiplePublishStore((state) => state.reset);
  const [hasResource, setHasResource] = useState<boolean | null>(null);
  const fetchRawData = useCallback(async (item: QortalGetMetadata) => {
    const url = `/arbitrary/${item?.service}/${encodeURIComponent(item?.name)}/${encodeURIComponent(item?.identifier)}?encoding=base64`;
    const res = await fetch(url);
    const data = await res.text();
    if(returnType === 'BASE64'){
      return data
    }
    return base64ToObject(data);
  }, [returnType]);

  const getStorageKey = useCallback(() => {
    if (!username || !appNameHashed) return null;
    return `qortal_publish_${username}_${appNameHashed}`;
  }, [username, appNameHashed]);



  const fetchPublish = useCallback(
    async (
      metadataProp: QortalGetMetadata,
      disableFetch?: boolean
    ) => {
      let hasResource = null;
      let resource = null;
      let error = null;
      try {
        if (metadata) {
          setIsLoading(true);
        }
   
        const hasCache =  getPublish(metadataProp)

        if(hasCache){
            if(hasCache?.qortalMetadata.size === 32){
                if(metadata){
                    setHasResource(false)
                    setError(null)
                    
                }
                return {
                    resource: null,
                    error: null,
                    hasResource: false
                }
            }
            if(metadata){
                setHasResource(true)
                setError(null)
                setPublish(metadataProp, hasCache);
            }
            return {
                resource: hasCache,
                error: null,
                hasResource: true
            }
        }
        if(metadata && disableFetch){
          return {
            resource: null,
            error: null,
            hasResource: null
          }
        }
        const url = `/arbitrary/resources/search?mode=ALL&service=${metadataProp?.service}&limit=1&includemetadata=true&reverse=true&excludeblocked=true&name=${encodeURIComponent(metadataProp?.name)}&exactmatchnames=true&offset=0&identifier=${encodeURIComponent(metadataProp?.identifier)}`;
        const responseMetadata = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!responseMetadata?.ok) {
          if (metadata) {
            setError("Invalid search params");
          }
          return {
            hasResource,
            resource,
            error: "Invalid search params",
          };
        }
        const resMetadata = await responseMetadata.json();
        if (resMetadata?.length === 0) {
          hasResource = false;
          if (metadata) {
            setHasResource(false);
          }
        } else if (resMetadata[0]?.size === 32) {
          hasResource = false;
          if (metadata) {
            setHasResource(false);
          }
        } else {
          hasResource = true;
          if (metadata) {
            setHasResource(true);
          }

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
        hasResource,
        resource,
        error,
      };
    },
    [metadata]
  );


  useEffect(() => {

    if (metadata?.identifier && metadata?.name && metadata?.service) {
      fetchPublish(metadata, disableFetch);
    }
  }, [metadata?.identifier, metadata?.service, metadata?.identifier, returnType, disableFetch]);

  const refetchData =  useCallback(async ()=> {
    if(!metadata) throw new Error('usePublish is missing metadata')
    return await fetchPublish(metadata)
  }, [metadata])


  const deleteResource = useCallback(async (publish: QortalGetMetadata) => {
    const res = await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      service: publish.service,
      identifier: publish.identifier,
      data64: "RA==",
    });

    if (res?.signature) {
      setPublish(publish, null);
      setError(null)
      setIsLoading(false)
      setHasResource(false)
      markResourceAsDeleted(publish)
      return true;
    }
  }, [getStorageKey]);

 
  const updatePublish = useCallback(async (publish: QortalGetMetadata, data: any) => {
      setError(null)
      setIsLoading(false)
      setHasResource(true)
      setPublish(publish, {qortalMetadata: {
        ...publish,
        created: Date.now(),
        updated: Date.now(),
        size: 100
      }, data});
 setResourceCache(
          `${publish?.service}-${publish?.name}-${publish?.identifier}`,
          {qortalMetadata: {
        ...publish,
        created: Date.now(),
        updated: Date.now(),
        size: 100
      }, data}
        );

    
  }, [getStorageKey, setPublish]);

const publishMultipleResources = useCallback(async (resources: ResourceToPublish[]): Promise<Error | QortalGetMetadata[]> => {
   return new Promise(async (resolve, reject) => {
    const store = useMultiplePublishStore.getState();
    const storeStatus = usePublishStatusStore.getState();

    store.setPublishResources(resources);
    store.setIsPublishing(true);
    store.setCompletionResolver(resolve);
    store.setRejectionResolver(reject);
  try {
    store.setIsLoading(true);
    setPublishResources(resources);
    store.setError(null)
    store.setFailedPublishResources([])
    const lengthOfResources = resources?.length;
    const lengthOfTimeout = lengthOfResources * 1200000; // 20 minutes per resource
    console.log('lengthOfTimeout', lengthOfTimeout)
    const result = await qortalRequestWithTimeout({
      action: "PUBLISH_MULTIPLE_QDN_RESOURCES",
      resources
    }, lengthOfTimeout);
   
     store.complete(result);
      store.reset()
     storeStatus.reset()
  } catch (error: any) {
    console.log('timeout555')
    const unPublished = error?.error?.unsuccessfulPublishes;
    const failedPublishes: QortalGetMetadata[] = []
    if (unPublished && Array.isArray(unPublished)) {
      unPublished.forEach((item) => {
        const key = `${item?.service}-${item?.name}-${item?.identifier}`;

        setPublishStatusByKey(key, {
          error: {
            reason: item.reason
          }
        });
         failedPublishes.push({
        name: item?.name,
        service: item?.service,
        identifier: item?.identifier
      })
      });
     store.setFailedPublishResources(failedPublishes)
    } else  {
       store.setError(error?.message || 'Error during publish')
    }

  } finally {
    store.setIsLoading(false);
  }
})
}, [setPublishResources]);


  if (!metadata)
    return {
      fetchPublish,
      updatePublish,
      deletePublish: deleteResource,
      publishMultipleResources
    };

    return useMemo(() => ({
      isLoading,
      error,
      resource: publish || null,
      hasResource,
      refetch: refetchData,
      fetchPublish,
      updatePublish,
      deletePublish: deleteResource,
      publishMultipleResources
    }), [
      isLoading,
      error,
      publish,
      hasResource,
      refetchData,
      fetchPublish,
      updatePublish,
      deleteResource,
      publishMultipleResources
    ]);
    
};
