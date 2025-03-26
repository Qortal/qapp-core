import React, { useCallback } from "react";
import {
  QortalMetadata,
  QortalSearchParams,
} from "../types/interfaces/resources";
import { ListItem, useCacheStore } from "../state/cache";
import { RequestQueueWithPromise } from "../utils/queue";
import { base64ToUint8Array, uint8ArrayToObject } from "../utils/base64";
import { retryTransaction } from "../utils/publish";
import { ReturnType } from "../components/ResourceList/ResourceListDisplay";
import { useListStore } from "../state/lists";

export const requestQueueProductPublishes = new RequestQueueWithPromise(20);
export const requestQueueProductPublishesBackup = new RequestQueueWithPromise(
  10
);

export interface Resource {
  qortalMetadata: QortalMetadata;
  data: any;
}
export const useResources = (retryAttempts: number = 2) => {
  const setSearchCache = useCacheStore((s) => s.setSearchCache);
  const getSearchCache = useCacheStore((s) => s.getSearchCache);
  const getResourceCache = useCacheStore((s) => s.getResourceCache);
  const setResourceCache = useCacheStore((s) => s.setResourceCache);
  const addTemporaryResource = useCacheStore((s) => s.addTemporaryResource);
  const markResourceAsDeleted = useCacheStore((s) => s.markResourceAsDeleted);
  
  const deleteList = useListStore(state => state.deleteList)
  const requestControllers = new Map<string, AbortController>();

  const getArbitraryResource = async (
    url: string,
    key: string
  ): Promise<string> => {
    // ✅ Create or reuse an existing controller
    let controller = requestControllers.get(key);
    if (!controller) {
      controller = new AbortController();
      requestControllers.set(key, controller);
    }

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res?.ok) throw new Error("Error in downloading");
      return await res.text();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(`Request cancelled: ${key}`);
        return "canceled"; // Return empty response on cancel
      } else {
        console.error(`Fetch error: ${key}`, error);
      }
      throw error;
    } finally {
      requestControllers.delete(key); // ✅ Cleanup controller after request
    }
  };

  const cancelAllRequests = () => {
    requestControllers.forEach((controller, key) => {
      controller.abort();
    });
    requestControllers.clear();
  };

  const fetchIndividualPublishJson = useCallback(
    async (
      item: QortalMetadata,
      returnType: ReturnType,
      includeMetadata?: boolean
    ): Promise<false | ListItem | null | undefined> => {
      try {
        const key = `${item?.service}-${item?.name}-${item?.identifier}`;

        const cachedProduct = getResourceCache(
          `${item?.service}-${item?.name}-${item?.identifier}`
        );

        if (cachedProduct) return cachedProduct;
        setResourceCache(
          `${item?.service}-${item?.name}-${item?.identifier}`,
          null
        );
        let hasFailedToDownload = false;
        let res: string | undefined = undefined;
        let metadata 
        try {
          if (includeMetadata) {
            const url = `/arbitrary/resources/search?mode=ALL&service=${item?.service}&limit=1&includemetadata=true&reverse=true&excludeblocked=true&name=${item?.name}&exactmatchnames=true&offset=0&identifier=${item?.identifier}`;
            const response = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            if (!response?.ok) return false;
            const resMetadata = await response.json();
            if (resMetadata?.length === 0) {
              setResourceCache(
                `${item?.service}-${item?.name}-${item?.identifier}`,
                false
              );
              return false;
            }
             metadata = resMetadata[0];
          }
          res = await requestQueueProductPublishes.enqueue(
            (): Promise<string> => {
              return getArbitraryResource(
                `/arbitrary/${item?.service}/${item?.name}/${item?.identifier}?encoding=base64`,
                key
              );
            }
          );
        } catch (error) {
          hasFailedToDownload = true;
        }

        if (res === "canceled") return false;

        if (hasFailedToDownload) {
          await new Promise((res) => {
            setTimeout(() => {
              res(null);
            }, 10000);
          });

          try {
            const fetchRetries = async ()=> {
             return await requestQueueProductPublishesBackup.enqueue(
                (): Promise<string> => {
                  return getArbitraryResource(
                    `/arbitrary/${item?.service}/${item?.name}/${item?.identifier}?encoding=base64`,
                    key
                  );
                }
              );
            }
           res = await retryTransaction(
              fetchRetries,
                        [],
                        true,
                        retryAttempts
                      );
          } catch (error) {
            setResourceCache(
              `${item?.service}-${item?.name}-${item?.identifier}`,
              false
            );
            return false;
          }
        }
        if (res) {
          if(returnType === 'BASE64'){
            const fullDataObject = {
              data: res,
              qortalMetadata: includeMetadata ? metadata : item,
            };
            setResourceCache(
              `${item?.service}-${item?.name}-${item?.identifier}`,
              fullDataObject
            );
            return fullDataObject;
          }
          const toUint = base64ToUint8Array(res);
          const toObject = uint8ArrayToObject(toUint);
          const fullDataObject = {
            data: { ...toObject },
            qortalMetadata: includeMetadata ? metadata : item,
          };
          setResourceCache(
            `${item?.service}-${item?.name}-${item?.identifier}`,
            fullDataObject
          );
          return fullDataObject;
        }
      } catch (error) {
        return false;
      }
    },
    [getResourceCache, setResourceCache]
  );

  const fetchDataFromResults = useCallback(
    (responseData: QortalMetadata[], returnType: ReturnType): void => {
      for (const item of responseData) {
        fetchIndividualPublishJson(item, returnType, false);
      }
    },
    [fetchIndividualPublishJson]
  );

  const fetchResources = useCallback(
    async (
      params: QortalSearchParams,
      listName: string,
      returnType: ReturnType = 'JSON',
      cancelRequests?: boolean,
    ): Promise<QortalMetadata[]> => {
      if (cancelRequests) {
        cancelAllRequests();
      }

      const cacheKey = generateCacheKey(params);
      const searchCache = getSearchCache(listName, cacheKey);
      if (searchCache) {
        return searchCache;
      }

      let responseData: QortalMetadata[] = [];
      let filteredResults: QortalMetadata[] = [];
      let lastCreated = params.before || null;
      const targetLimit = params.limit ?? 20; // Use `params.limit` if provided, else default to 20

      while (filteredResults.length < targetLimit) {
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          mode: "ALL",
          ...params,
          limit: targetLimit - filteredResults.length, // Adjust limit dynamically
          before: lastCreated,
        });

        if (!response || response.length === 0) {
          break; // No more data available
        }

        responseData = response;
        const validResults = responseData.filter((item) => item.size !== 32);
        filteredResults = [...filteredResults, ...validResults];

        if (filteredResults.length >= targetLimit) {
          filteredResults = filteredResults.slice(0, targetLimit);
          break;
        }

        lastCreated = responseData[responseData.length - 1]?.created;
        if (!lastCreated) break;
      }

      setSearchCache(listName, cacheKey, filteredResults);
      fetchDataFromResults(filteredResults, returnType);

      return filteredResults;
    },
    [getSearchCache, setSearchCache, fetchDataFromResults]
  );

  const fetchResourcesResultsOnly = useCallback(
    async (
      params: QortalSearchParams,
      listName: string,
      returnType: ReturnType = 'JSON'
    ): Promise<QortalMetadata[]> => {

      let responseData: QortalMetadata[] = [];
      let filteredResults: QortalMetadata[] = [];
      let lastCreated = params.before || null;
      const targetLimit = params.limit ?? 20;
  
      while (filteredResults.length < targetLimit) {
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          mode: "ALL",
          ...params,
          limit: targetLimit - filteredResults.length,
          before: lastCreated,
        });
  
        if (!response || response.length === 0) break;
  
        responseData = response;
        const validResults = responseData.filter((item) => item.size !== 32);
        filteredResults = [...filteredResults, ...validResults];
  
        if (filteredResults.length >= targetLimit) {
          filteredResults = filteredResults.slice(0, targetLimit);
          break;
        }
  
        lastCreated = responseData[responseData.length - 1]?.created;
        if (!lastCreated) break;
      }
  
      return filteredResults;
    },
    [cancelAllRequests, fetchDataFromResults]
  );
  

  const addNewResources = useCallback(
    (listName: string, resources: Resource[]) => {

      addTemporaryResource(
        listName,
        resources.map((item) => item.qortalMetadata)
      );
      resources.forEach((temporaryResource) => {
        setResourceCache(
          `${temporaryResource?.qortalMetadata?.service}-${temporaryResource?.qortalMetadata?.name}-${temporaryResource?.qortalMetadata?.identifier}`,
          temporaryResource
        );
      });
    },
    []
  );

  const updateNewResources = useCallback((resources: Resource[]) => {
    resources.forEach((temporaryResource) => {
      setResourceCache(
        `${temporaryResource?.qortalMetadata?.service}-${temporaryResource?.qortalMetadata?.name}-${temporaryResource?.qortalMetadata?.identifier}`,
        temporaryResource
      );
    });
  }, []);

  const deleteResource = useCallback(async (resourcesToDelete: QortalMetadata[]) => {

    
   
    
    const deletes = []
    for (const resource of resourcesToDelete) {
      if (!resource?.service || !resource?.identifier)
        throw new Error("Missing fields");
      deletes.push({
        service: resource.service,
        identifier: resource.identifier,
        base64: "RA==",
   });
 }
 await qortalRequestWithTimeout({
   action: "PUBLISH_MULTIPLE_QDN_RESOURCES",
   resources: deletes,
 }, 600000);
 resourcesToDelete.forEach((item)=> {
  markResourceAsDeleted(item);
 })
    return true;
  }, []);

  

  return {
    fetchResources,
    addNewResources,
    updateNewResources,
    deleteResource,
    deleteList,
    fetchResourcesResultsOnly
  };
};

export const generateCacheKey = (params: QortalSearchParams): string => {
  const {
    identifier,
    service,
    query,
    name,
    names,
    keywords,
    title,
    description,
    prefix,
    exactMatchNames,
    minLevel,
    nameListFilter,
    followedOnly,
    excludeBlocked,
    before,
    after,
    limit,
    offset,
    reverse,
    mode,
  } = params;

  const keyParts = [
    `catalog-${service}`,
    `id-${identifier}`,
    query && `q-${query}`,
    name && `n-${name}`,
    names && `ns-${names.join(",")}`,
    keywords && `kw-${keywords.join(",")}`,
    title && `t-${title}`,
    description && `desc-${description}`,
    prefix !== undefined && `p-${prefix}`,
    exactMatchNames !== undefined && `ex-${exactMatchNames}`,
    minLevel !== undefined && `ml-${minLevel}`,
    nameListFilter && `nf-${nameListFilter}`,
    followedOnly !== undefined && `fo-${followedOnly}`,
    excludeBlocked !== undefined && `eb-${excludeBlocked}`,
    before !== undefined && `b-${before}`,
    after !== undefined && `a-${after}`,
    limit !== undefined && `l-${limit}`,
    offset !== undefined && `o-${offset}`,
    reverse !== undefined && `r-${reverse}`,
    mode !== undefined && `mo-${mode}`,
  ]
    .filter(Boolean) // Remove undefined or empty values
    .join("_"); // Join into a string

  return keyParts;
};
