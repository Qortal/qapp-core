import React, { useCallback } from "react";
import {

  QortalMetadata,
  QortalSearchParams,
} from "../types/interfaces/resources";
import { useCacheStore } from "../state/cache";
import { RequestQueueWithPromise } from "../utils/queue";
import { base64ToUint8Array, uint8ArrayToObject } from "../utils/base64";

export const requestQueueProductPublishes = new RequestQueueWithPromise(20);
export const requestQueueProductPublishesBackup = new RequestQueueWithPromise(
  5
);


interface TemporaryResource {
  qortalMetadata: QortalMetadata;
  data: any;
}
export const useResources = () => {
  const {
    setSearchCache,
    getSearchCache,
    getResourceCache,
    setResourceCache,
    addTemporaryResource,
    markResourceAsDeleted
  } = useCacheStore();
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

  const fetchIndividualPublish = useCallback(
    async (item: QortalMetadata) => {
      try {
        const key = `${item?.service}-${item?.name}-${item?.identifier}`;

        const cachedProduct = getResourceCache(
          `${item?.service}-${item?.name}-${item?.identifier}`
        );
        if (cachedProduct) return;
        setResourceCache(
          `${item?.service}-${item?.name}-${item?.identifier}`,
          null
        );
        let hasFailedToDownload = false;
        let res: string | undefined = undefined;
        try {
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
            }, 15000);
          });

          try {
            res = await requestQueueProductPublishesBackup.enqueue(
              (): Promise<string> => {
                return getArbitraryResource(
                  `/arbitrary/${item?.service}/${item?.name}/${item?.identifier}?encoding=base64`,
                  key
                );
              }
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
          const toUint = base64ToUint8Array(res);
          const toObject = uint8ArrayToObject(toUint);
          const fullDataObject = {
            data: { ...toObject },
            qortalMetadata: item,
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
    (responseData: QortalMetadata[]): void => {
      for (const item of responseData) {
        fetchIndividualPublish(item);
      }
    },
    [fetchIndividualPublish]
  );

  const fetchResources = useCallback(
    async (
      params: QortalSearchParams,
      listName: string,
      cancelRequests?: boolean
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
        const validResults = responseData.filter(item => item.size !== 32);
        filteredResults = [...filteredResults, ...validResults];
  
        if (filteredResults.length >= targetLimit) {
          filteredResults = filteredResults.slice(0, targetLimit);
          break;
        }
  
        lastCreated = responseData[responseData.length - 1]?.created;
        if (!lastCreated) break;
      }
  
      setSearchCache(listName, cacheKey, filteredResults);
      fetchDataFromResults(filteredResults);
  
      return filteredResults;
    },
    [getSearchCache, setSearchCache, fetchDataFromResults]
  );
  
  

  const addNewResources = useCallback(
    (listName: string, resources: TemporaryResource[]) => {
      addTemporaryResource(
        listName,
        resources.map((item) => item.qortalMetadata)
      );
      resources.forEach((temporaryResource) => {
        setResourceCache(
          `${temporaryResource?.qortalMetadata?.service}-${temporaryResource?.qortalMetadata?.name}-${temporaryResource?.qortalMetadata?.identifier}`,
          temporaryResource.data
        );
      });
    },
    []
  );

  const updateNewResources = useCallback(
    (resources: TemporaryResource[]) => {

      resources.forEach((temporaryResource) => {
        setResourceCache(
          `${temporaryResource?.qortalMetadata?.service}-${temporaryResource?.qortalMetadata?.name}-${temporaryResource?.qortalMetadata?.identifier}`,
          temporaryResource.data
        );
      });
    },
    []
  );

  const deleteProduct = useCallback(async (qortalMetadata: QortalMetadata)=> {
    if(!qortalMetadata?.service || !qortalMetadata?.identifier) throw new Error('Missing fields')
       await qortalRequest({
                action: "PUBLISH_QDN_RESOURCE",
                service: qortalMetadata.service,
                identifier: qortalMetadata.identifier,
                base64: 'RA==',
              });
              markResourceAsDeleted(qortalMetadata)
       return true
  }, [])


  return {
    fetchResources,
    fetchIndividualPublish,
    addNewResources,
    updateNewResources,
    deleteProduct,
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
