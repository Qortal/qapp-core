import React, { useCallback, useMemo } from "react";
import {
  QortalGetMetadata,
  QortalMetadata,
  QortalPreloadedParams,
  QortalSearchParams,
  SecondaryDataSource,
} from '../types/interfaces/resources';
import { ListItem, useCacheStore } from '../state/cache';
import { RequestQueueWithPromise } from '../utils/queue';
import { base64ToUint8Array, uint8ArrayToObject } from '../utils/base64';
import { retryTransaction } from '../utils/publish';
import { ReturnType } from '../components/ResourceList/ResourceListDisplay';
import { useListStore } from '../state/lists';
import { usePublishStore } from '../state/publishes';

export const requestQueueProductPublishes = new RequestQueueWithPromise(12);
export const requestQueueProductPublishesBackup = new RequestQueueWithPromise(
  6
);
export const requestQueueResourcesResultsOnly = new RequestQueueWithPromise(4);

export interface Resource {
  qortalMetadata: QortalMetadata;
  data: any;
}
export const useResources = (retryAttempts: number = 2, maxSize = 5242880) => {
  const setSearchCache = useCacheStore((s) => s.setSearchCache);
  const deleteSearchCache = useCacheStore((s)=> s.deleteSearchCache)
  const getSearchCache = useCacheStore((s) => s.getSearchCache);
  const getResourceCache = useCacheStore((s) => s.getResourceCache);
  const setResourceCache = useCacheStore((s) => s.setResourceCache);
  const addTemporaryResource = useCacheStore((s) => s.addTemporaryResource);
  const markResourceAsDeleted = useCacheStore((s) => s.markResourceAsDeleted);
  const setSearchParamsForList = useCacheStore((s) => s.setSearchParamsForList);
  const getPaginationState = useCacheStore((s) => s.getPaginationState);
  const setPaginationState = useCacheStore((s) => s.setPaginationState);
  const clearPaginationState = useCacheStore((s) => s.clearPaginationState);
  const addList = useListStore((s) => s.addList);
    const setPublish = usePublishStore((state)=> state.setPublish)
  
  const deleteListInStore = useListStore(state => state.deleteList)

  const deleteList = useCallback((listName: string)=> {
    deleteListInStore(listName)
    deleteSearchCache(listName)
  }, [])
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

  const cancelAllRequests = useCallback(() => {
    requestControllers.forEach((controller, key) => {
      controller.abort();
    });
    requestControllers.clear();
  }, []);

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
            const url = `/arbitrary/resources/search?mode=ALL&service=${item?.service}&limit=1&includemetadata=true&reverse=true&excludeblocked=true&name=${encodeURIComponent(item?.name)}&exactmatchnames=true&offset=0&identifier=${encodeURIComponent(item?.identifier)}`;
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
                `/arbitrary/${item?.service}/${encodeURIComponent(item?.name)}/${encodeURIComponent(item?.identifier)}?encoding=base64`,
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
                    `/arbitrary/${item?.service}/${encodeURIComponent(item?.name)}/${encodeURIComponent(item?.identifier)}?encoding=base64`,
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
          setPublish(fullDataObject?.qortalMetadata, fullDataObject);
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
      filterOutDuplicateIdentifiers?: boolean,
      existingIdentifiers?: string[]
    ): Promise<QortalMetadata[]> => {
      if (cancelRequests) {
        cancelAllRequests();
      }
      const cacheKey = generateCacheKey(params, filterOutDuplicateIdentifiers);
      const searchCache = getSearchCache(listName, cacheKey);
      if (searchCache) {
        const copyParams = {...params}
        delete copyParams.after
        delete copyParams.before
        delete copyParams.offset
        setSearchParamsForList(listName, JSON.stringify(copyParams))
        fetchDataFromResults(searchCache, returnType);
        return searchCache;
      }

      let responseData: QortalMetadata[] = [];
      let filteredResults: QortalMetadata[] = [];
      let lastCreated = params.before || undefined;
      const targetLimit = params.limit ?? 20; // Use `params.limit` if provided, else default to 20
      const isUnlimited = params.limit === 0;
      const seenIdentifiers = filterOutDuplicateIdentifiers
        ? new Set<string>(existingIdentifiers || [])
        : null;

      while (isUnlimited || filteredResults.length < targetLimit) {
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          mode: "ALL",
          ...params,
          limit: targetLimit - filteredResults.length, // Adjust limit dynamically
          before: lastCreated,
          excludeBlocked: true
        });
        if (!response || response.length === 0) {
          break; // No more data available
        }

        responseData = response;
        let validResults = responseData.filter(
          (item) => item.size !== 32 && item.size < maxSize
        );

        // Filter out duplicate identifiers during the fetch loop
        if (filterOutDuplicateIdentifiers && seenIdentifiers) {
          validResults = validResults.filter((item) => {
            if (seenIdentifiers.has(item.identifier)) {
              return false;
            }
            seenIdentifiers.add(item.identifier);
            return true;
          });
        }

        filteredResults = [...filteredResults, ...validResults];

        if (filteredResults.length >= targetLimit && !isUnlimited) {
          filteredResults = filteredResults.slice(0, targetLimit);
          break;
        }

        lastCreated = responseData[responseData.length - 1]?.created;
        if (isUnlimited) break;

        if (!lastCreated) break;
      }

      const copyParams = { ...params };
      delete copyParams.after;
      delete copyParams.before;
      delete copyParams.offset;
      setSearchCache(
        listName,
        cacheKey,
        filteredResults,
        cancelRequests ? JSON.stringify(copyParams) : null
      );
      fetchDataFromResults(filteredResults, returnType);

      return filteredResults;
    },
    [getSearchCache, setSearchCache, fetchDataFromResults]
  );

   const fetchPreloadedResources = useCallback(
    async (
      params: QortalPreloadedParams,
      listOfResources: QortalMetadata[],
      listName: string,
      returnType: ReturnType = 'JSON',
      cancelRequests?: boolean,
    ): Promise<QortalMetadata[]> => {
      if (cancelRequests) {
        cancelAllRequests();
      }

      // const cacheKey = generateCacheKey(params);
      const cacheKey = generatePreloadedCacheKey(params);
      const searchCache = getSearchCache(listName, cacheKey);
      if (searchCache) {
        const copyParams = {...params}

        setSearchParamsForList(listName, JSON.stringify(copyParams))
        fetchDataFromResults(searchCache, returnType);
        return searchCache;
      }

      let responseData: QortalMetadata[] = [];
      let filteredResults: QortalMetadata[] = [];
      const targetLimit = params.offset || 20; // Use `params.limit` if provided, else default to 20
      const isUnlimited = params.limit === 0;

      if(isUnlimited){
        filteredResults = listOfResources
      } else {
        filteredResults = listOfResources?.slice(0, targetLimit)
      }
      const copyParams = {...params}
     
      setSearchCache(listName, cacheKey, filteredResults, cancelRequests ? JSON.stringify(copyParams) : null);
      fetchDataFromResults(filteredResults, returnType);

      return filteredResults;
    },
    [getSearchCache, setSearchCache, fetchDataFromResults]
  );

  const fetchResourcesResultsOnly = useCallback(
    async (
      params: QortalSearchParams
    ): Promise<QortalMetadata[]> => {

      let responseData: QortalMetadata[] = [];
      let filteredResults: QortalMetadata[] = [];
      let lastCreated = params.before || undefined;
      const targetLimit = params.limit ?? 20; // Use `params.limit` if provided, else default to 20
      const isUnlimited = params.limit === 0;
      while (isUnlimited || filteredResults.length < targetLimit) {
        const response = await requestQueueResourcesResultsOnly.enqueue(() =>
          qortalRequest({
            action: 'SEARCH_QDN_RESOURCES',
            mode: 'ALL',
            ...params,
            limit: targetLimit - filteredResults.length,
            before: lastCreated,
            excludeBlocked: true,
          })
        );

        if (!response || response.length === 0) break;
  
        responseData = response;
        const validResults = responseData.filter((item) => item.size !== 32);
        filteredResults = [...filteredResults, ...validResults];
  
        if (filteredResults.length >= targetLimit && !isUnlimited) {
          filteredResults = filteredResults.slice(0, targetLimit);
          break;
        }
  
        lastCreated = responseData[responseData.length - 1]?.created;
        if (isUnlimited) break;
        if (!lastCreated) break;
      }
  
      return filteredResults;
    },
    [cancelAllRequests, fetchDataFromResults]
  );
  

  const fetchResourcesWithPriority = useCallback(
    async (
      primaryParams: QortalSearchParams,
      secondarySources: SecondaryDataSource[] | undefined,
      listName: string,
      returnType: ReturnType = 'JSON',
      cancelRequests: boolean = false,
      paginationMode: 'initial' | 'more' = 'initial',
      filterDuplicateIdentifiers: boolean = false,
      identifierOperations?: any,
      currentList?: QortalMetadata[]
    ): Promise<QortalMetadata[]> => {
      if (cancelRequests) {
        cancelAllRequests();
      }

      const targetLimit = primaryParams.limit || 20;

      // If no secondary sources, use regular fetch
      if (!secondarySources || secondarySources.length === 0) {
        const fetchParams = { ...primaryParams };

        // For pagination mode, set the before parameter
        if (
          paginationMode === 'more' &&
          currentList &&
          currentList.length > 0
        ) {
          fetchParams.before = currentList[currentList.length - 1].created;
        }

        // Build existing identifiers for filterDuplicateIdentifiers
        const existingIdentifiers =
          filterDuplicateIdentifiers && currentList
            ? currentList.map((item) => item.identifier)
            : undefined;

        const results = await fetchResources(
          fetchParams,
          listName,
          returnType,
          cancelRequests,
          filterDuplicateIdentifiers,
          existingIdentifiers
        );

        // Clear pagination state for initial fetch
        if (paginationMode === 'initial') {
          clearPaginationState(listName);
        }

        return results;
      }

      // Clear pagination state on initial fetch
      if (paginationMode === 'initial') {
        clearPaginationState(listName);
      }

      // Build all sources (primary + secondary)
      interface SourceWithKey {
        priority: number;
        params: QortalSearchParams;
        sourceKey: string;
        isPrimary: boolean;
      }

      const allSources: SourceWithKey[] = [
        {
          priority: 0,
          params: primaryParams,
          sourceKey: 'primary',
          isPrimary: true,
        },
      ];

      // Process secondary sources
      for (let i = 0; i < secondarySources.length; i++) {
        const source = secondarySources[i];
        let params: QortalSearchParams;

        // Handle entityParams resolution
        if ('entityParams' in source.params) {
          if (!identifierOperations?.buildSearchPrefix) {
            console.error(
              'identifierOperations.buildSearchPrefix not provided'
            );
            continue;
          }
          try {
            const identifier = await identifierOperations.buildSearchPrefix(
              source.params.entityParams.entityType,
              source.params.entityParams.parentId || null
            );
            params = {
              ...primaryParams,
              identifier,
            };
          } catch (error) {
            console.error('Failed to build search prefix:', error);
            continue;
          }
        } else {
          params = source.params as QortalSearchParams;
        }

        allSources.push({
          priority: source.priority,
          params,
          sourceKey: `s-${source.priority}`,
          isPrimary: false,
        });
      }

      // Sort by priority
      allSources.sort((a, b) => a.priority - b.priority);

      // Build list of existing identifiers from current list (for filterDuplicateIdentifiers)
      const existingIdentifiers =
        filterDuplicateIdentifiers && currentList
          ? currentList.map((item) => item.identifier)
          : undefined;

      // Fetch from all sources in parallel
      const allFetches = await Promise.all(
        allSources.map(async (source) => {
          try {
            // Get pagination state for this source
            const paginationState = getPaginationState(
              listName,
              source.sourceKey
            );

            // Prepare params with pagination
            const fetchParams = { ...source.params };
            if (paginationMode === 'more') {
              if (paginationState?.before) {
                // Use stored pagination state
                fetchParams.before = paginationState.before;
              } else if (currentList && currentList.length > 0) {
                // Fallback: use last item from current list
                fetchParams.before =
                  currentList[currentList.length - 1].created;
              }
            }

            // Fetch data - pass existing identifiers to filter duplicates

            const data = await fetchResources(
              fetchParams,
              source.isPrimary ? listName : `${listName}-${source.sourceKey}`,
              returnType,
              source.isPrimary && cancelRequests,
              filterDuplicateIdentifiers,
              existingIdentifiers
            );

            return {
              priority: source.priority,
              sourceKey: source.sourceKey,
              data: data || [],
              fetchParams,
            };
          } catch (error) {
            console.error(`Priority ${source.priority} fetch failed:`, error);
            return {
              priority: source.priority,
              sourceKey: source.sourceKey,
              data: [],
              fetchParams: source.params,
            };
          }
        })
      );

      // Weighted distribution merge
      const allResults: QortalMetadata[] = [];
      const seenKeys = new Set<string>();
      const seenIdentifiersForFilter = filterDuplicateIdentifiers
        ? new Set<string>(existingIdentifiers || [])
        : null;

      // Track last item actually used from each source for pagination
      const lastUsedPerSource = new Map<string, QortalMetadata>();

      // Calculate total weight (priority as weight)
      const totalWeight = allFetches.reduce(
        (sum, fetch) => sum + (fetch.priority || 1),
        0
      );

      // Calculate target count for each source based on weight
      const sourcesWithTargets = allFetches.map((fetch) => {
        const weight = fetch.priority || 1;
        const targetCount = Math.floor((weight / totalWeight) * targetLimit);
        return {
          ...fetch,
          targetCount,
          currentIndex: 0,
        };
      });

      // Distribute items proportionally using round-robin with weights
      let remainingSlots = targetLimit;
      let sourcesExhausted = 0;

      while (
        remainingSlots > 0 &&
        sourcesExhausted < sourcesWithTargets.length
      ) {
        sourcesExhausted = 0;

        for (const source of sourcesWithTargets) {
          if (remainingSlots <= 0) break;

          // Skip if this source has no more data
          if (source.currentIndex >= source.data.length) {
            sourcesExhausted++;
            continue;
          }

          // Calculate how many items this source should contribute this round
          const weight = source.priority || 1;
          const itemsToTake = Math.max(
            1,
            Math.floor((weight / totalWeight) * 10)
          );

          let taken = 0;
          while (
            taken < itemsToTake &&
            source.currentIndex < source.data.length &&
            remainingSlots > 0
          ) {
            const item = source.data[source.currentIndex];
            source.currentIndex++;

            // If filterDuplicateIdentifiers is enabled, check identifier first
            if (filterDuplicateIdentifiers && seenIdentifiersForFilter) {
              if (seenIdentifiersForFilter.has(item.identifier)) {
                continue; // Skip - identifier already seen
              }
            }

            // Always deduplicate by full key
            const fullKey = `${item.service}-${item.name}-${item.identifier}`;
            if (seenKeys.has(fullKey)) continue;

            // Add item
            seenKeys.add(fullKey);
            if (seenIdentifiersForFilter) {
              seenIdentifiersForFilter.add(item.identifier);
            }
            allResults.push(item);

            // Track this as the last used item from this source
            if (source.sourceKey) {
              lastUsedPerSource.set(source.sourceKey, item);
            }

            remainingSlots--;
            taken++;
          }

          if (source.currentIndex >= source.data.length) {
            sourcesExhausted++;
          }
        }
      }

      // Update pagination state for each source based on last item actually USED
      sourcesWithTargets.forEach((source) => {
        if (!source.sourceKey) return; // Skip if no sourceKey

        const lastUsedItem = lastUsedPerSource.get(source.sourceKey);

        if (lastUsedItem) {
          // We used items from this source - update pagination state
          setPaginationState(listName, source.sourceKey, {
            before: lastUsedItem.created,
            hasMore:
              source.currentIndex < source.data.length ||
              source.data.length === (source.fetchParams?.limit || 20),
            lastFetchedCount: source.data.length,
          });
        } else if (source.data.length === 0) {
          // No data from this source
          const paginationState = getPaginationState(
            listName,
            source.sourceKey
          );
          setPaginationState(listName, source.sourceKey, {
            before: paginationState?.before || null,
            hasMore: false,
            lastFetchedCount: 0,
          });
        }
        // If we fetched data but didn't use any (all filtered out), keep existing pagination state
      });

      return allResults;
    },
    [
      fetchResources,
      cancelAllRequests,
      getPaginationState,
      setPaginationState,
      clearPaginationState,
    ]
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
        setPublish(temporaryResource?.qortalMetadata, temporaryResource);
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
        setPublish(temporaryResource?.qortalMetadata, temporaryResource);
    });
  }, []);

  const deleteResource = useCallback(
    async (resourcesToDelete: (QortalMetadata | QortalGetMetadata)[]) => {
      const deletes = [];
      for (const resource of resourcesToDelete) {
        if (!resource?.service || !resource?.identifier)
          throw new Error('Missing fields');
        deletes.push({
          name: resource?.name || '',
          service: resource.service,
          identifier: resource.identifier,
          data64: 'RA==',
        });
      }

      await qortalRequestWithTimeout(
        {
          action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
          resources: deletes,
        },
        600000
      );
      resourcesToDelete.forEach((item) => {
        markResourceAsDeleted(item);
        setPublish(item, null);
      });
      return true;
    },
    []
  );

  return useMemo(
    () => ({
      fetchResources,
      addNewResources,
      updateNewResources,
      deleteResource,
      deleteList,
      addList,
      fetchResourcesResultsOnly,
      fetchPreloadedResources,
      fetchResourcesWithPriority,
      cancelAllRequests,
    }),
    [
      fetchResources,
      addNewResources,
      updateNewResources,
      deleteResource,
      deleteList,
      fetchResourcesResultsOnly,
      addList,
      fetchPreloadedResources,
      fetchResourcesWithPriority,
      cancelAllRequests,
    ]
  );
};

export const generateCacheKey = (
  params: QortalSearchParams,
  filterOutDuplicateIdentifiers?: boolean
): string => {
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
    filterOutDuplicateIdentifiers !== undefined &&
      `fodi-${filterOutDuplicateIdentifiers}`,
  ]
    .filter(Boolean) // Remove undefined or empty values
    .join("_"); // Join into a string

  return keyParts;
};


export const generatePreloadedCacheKey = (params: QortalPreloadedParams): string => {
  const {
 limit,
 offset
  } = params;

  const keyParts = [
   
    limit !== undefined && `l-${limit}`,
     offset !== undefined && `o-${offset}`,
  ]
    .filter(Boolean) // Remove undefined or empty values
    .join("_"); // Join into a string

  return keyParts;
};
