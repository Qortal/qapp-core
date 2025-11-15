import { create } from "zustand";
import {
  QortalGetMetadata,
  QortalMetadata,
} from "../types/interfaces/resources";
import { persist } from "zustand/middleware";

interface SearchCache {
  [listName: string]: {
    searches: {
      [searchTerm: string]: QortalMetadata[]; // List of products for each search term
    };
    temporaryNewResources: QortalMetadata[];
    expiry: number; // Expiry timestamp for the whole list
    searchParamsStringified: string;
  };
}

export const mergeUniqueItems = (
  array1: QortalMetadata[],
  array2: QortalMetadata[],
) => {
  const mergedArray = [...array1, ...array2];

  // Use a Map to ensure uniqueness based on `identifier-name`
  const uniqueMap = new Map();

  mergedArray.forEach((item) => {
    if (item.identifier && item.name && item.service) {
      const key = `${item.service}-${item.name}-${item.identifier}`;
      uniqueMap.set(key, item);
    }
  });

  return Array.from(uniqueMap.values()); // Return the unique values
};

export interface ListItem {
  data: any;
  qortalMetadata: QortalMetadata;
}

interface resourceCache {
  [id: string]: {
    data: ListItem | false | null; // Cached resource data
    expiry: number; // Expiry timestamp in milliseconds
  };
}

interface DeletedResources {
  [key: string]: { deleted: true; expiry: number }; // ✅ Added expiry field
}

interface CacheState {
  resourceCache: resourceCache;

  searchCache: SearchCache;
  // Search cache actions
  setResourceCache: (
    id: string,
    data: ListItem | false | null,
    customExpiry?: number,
  ) => void;

  setSearchCache: (
    listName: string,
    searchTerm: string,
    data: QortalMetadata[],
    searchParamsStringified: string | null,
    customExpiry?: number,
  ) => void;
  setSearchParamsForList: (
    ListName: string,
    searchParamsStringified: string,
  ) => void;
  getSearchCache: (
    listName: string,
    searchTerm: string,
  ) => QortalMetadata[] | null;
  clearExpiredCache: () => void;
  getResourceCache: (
    id: string,
    ignoreExpire?: boolean,
  ) => ListItem | false | null;
  addTemporaryResource: (
    listName: string,
    newResources: QortalMetadata[],
    customExpiry?: number,
  ) => void;
  getTemporaryResources: (listName: string) => QortalMetadata[];
  deletedResources: DeletedResources;
  markResourceAsDeleted: (item: QortalMetadata | QortalGetMetadata) => void;
  filterOutDeletedResources: (items: QortalMetadata[]) => QortalMetadata[];
  isListExpired: (listName: string) => boolean | string;
  searchCacheExpiryDuration: number;
  resourceCacheExpiryDuration: number;
  setSearchCacheExpiryDuration: (duration: number) => void;
  setResourceCacheExpiryDuration: (duration: number) => void;
  deleteSearchCache: (listName: string) => void;
  filterSearchCacheItemsByNames: (names: string[]) => void;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  searchCacheExpiryDuration: 5 * 60 * 1000,
  resourceCacheExpiryDuration: 30 * 60 * 1000,
  resourceCache: {},
  searchCache: {},
  deletedResources: {},
  setSearchCacheExpiryDuration: (duration) =>
    set({ searchCacheExpiryDuration: duration }),
  setResourceCacheExpiryDuration: (duration) =>
    set({ resourceCacheExpiryDuration: duration }),
  getResourceCache: (id, ignoreExpire) => {
    const cache = get().resourceCache[id];
    if (cache) {
      if (cache.expiry > Date.now() || ignoreExpire) {
        return cache.data; // ✅ Return data if not expired
      } else {
        set((state) => {
          const updatedCache = { ...state.resourceCache };
          delete updatedCache[id]; // ✅ Remove expired entry
          return { resourceCache: updatedCache };
        });
      }
    }
    return null;
  },

  setResourceCache: (id, data, customExpiry) =>
    set((state) => {
      const expiry =
        Date.now() + (customExpiry || get().resourceCacheExpiryDuration);
      return {
        resourceCache: {
          ...state.resourceCache,
          [id]: { data, expiry },
        },
      };
    }),

  setSearchCache: (
    listName,
    searchTerm,
    data,
    searchParamsStringified,
    customExpiry,
  ) =>
    set((state) => {
      const expiry =
        Date.now() + (customExpiry || get().searchCacheExpiryDuration);

      return {
        searchCache: {
          ...state.searchCache,
          [listName]: {
            searches: {
              ...(state.searchCache[listName]?.searches || {}),
              [searchTerm]: data,
            },
            temporaryNewResources:
              state.searchCache[listName]?.temporaryNewResources || [],
            expiry,
            searchParamsStringified:
              searchParamsStringified === null
                ? state.searchCache[listName]?.searchParamsStringified
                : searchParamsStringified,
          },
        },
      };
    }),
  deleteSearchCache: (listName) =>
    set((state) => {
      const updatedSearchCache = { ...state.searchCache };
      delete updatedSearchCache[listName];
      return { searchCache: updatedSearchCache };
    }),
  setSearchParamsForList: (listName, searchParamsStringified) =>
    set((state) => {
      const existingList = state.searchCache[listName] || {};

      return {
        searchCache: {
          ...state.searchCache,
          [listName]: {
            ...existingList,
            searchParamsStringified,
          },
        },
      };
    }),

  getSearchCache: (listName, searchTerm) => {
    const cache = get().searchCache[listName];
    if (cache) {
      if (cache.expiry > Date.now()) {
        return cache.searches[searchTerm] || null; // ✅ Return if valid
      } else {
        set((state) => {
          const updatedCache = { ...state.searchCache };
          delete updatedCache[listName]; // ✅ Remove expired list
          return { searchCache: updatedCache };
        });
      }
    }
    return null;
  },

  addTemporaryResource: (listName, newResources, customExpiry) =>
    set((state) => {
      const expiry = Date.now() + (customExpiry || 5 * 60 * 1000);

      const existingResources =
        state.searchCache[listName]?.temporaryNewResources || [];

      // Merge & remove duplicates, keeping the latest by `created` timestamp
      const uniqueResourcesMap = new Map<string, QortalMetadata>();

      [...existingResources, ...newResources].forEach((item) => {
        const key = `${item.service}-${item.name}-${item.identifier}`;
        const existingItem = uniqueResourcesMap.get(key);

        if (!existingItem || item.created > existingItem.created) {
          uniqueResourcesMap.set(key, item);
        }
      });

      return {
        searchCache: {
          ...state.searchCache,
          [listName]: {
            ...state.searchCache[listName],
            temporaryNewResources: Array.from(uniqueResourcesMap.values()),
            expiry,
          },
        },
      };
    }),

  getTemporaryResources: (listName: string) => {
    const cache = get().searchCache[listName];
    if (cache && cache.expiry > Date.now()) {
      const resources = cache.temporaryNewResources || [];
      return [...resources].sort((a, b) => b?.created - a?.created);
    }
    return [];
  },

  markResourceAsDeleted: (item) =>
    set((state) => {
      const now = Date.now();
      const expiry = now + 5 * 60 * 1000; // ✅ Expires in 5 minutes

      // ✅ Remove expired deletions before adding a new one
      const validDeletedResources = Object.fromEntries(
        Object.entries(state.deletedResources).filter(
          ([_, value]) => value.expiry > now,
        ),
      );

      const key = `${item.service}-${item.name}-${item.identifier}`;
      return {
        deletedResources: {
          ...validDeletedResources, // ✅ Keep only non-expired ones
          [key]: { deleted: true, expiry },
        },
      };
    }),

  filterOutDeletedResources: (items) => {
    const deletedResources = get().deletedResources; // ✅ Read without modifying store
    return items.filter(
      (item) =>
        !deletedResources[`${item.service}-${item.name}-${item.identifier}`],
    );
  },
  isListExpired: (listName: string): boolean | string => {
    const cache = get().searchCache[listName];
    const isExpired = cache ? cache.expiry <= Date.now() : true; // ✅ Expired if expiry timestamp is in the past
    return isExpired === true ? true : cache.searchParamsStringified;
  },

  clearExpiredCache: () =>
    set((state) => {
      const now = Date.now();
      const validSearchCache = Object.fromEntries(
        Object.entries(state.searchCache).filter(
          ([, value]) => value.expiry > now,
        ),
      );
      return { searchCache: validSearchCache };
    }),
  filterSearchCacheItemsByNames: (names) =>
    set((state) => {
      const updatedSearchCache: SearchCache = {};

      for (const [listName, list] of Object.entries(state.searchCache)) {
        const updatedSearches: { [searchTerm: string]: QortalMetadata[] } = {};

        for (const [term, items] of Object.entries(list.searches)) {
          updatedSearches[term] = items.filter(
            (item) => !names.includes(item.name),
          );
        }

        updatedSearchCache[listName] = {
          ...list,
          searches: updatedSearches,
        };
      }

      return { searchCache: updatedSearchCache };
    }),
}));
