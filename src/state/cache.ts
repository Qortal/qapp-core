import { create } from "zustand";
import { QortalMetadata } from "../types/interfaces/resources";


interface SearchCache {
  [searchTerm: string]: {
    data: QortalMetadata[]; // List of products for the search term
    expiry: number; // Expiry timestamp in milliseconds
  };
}


export const mergeUniqueItems = (array1: QortalMetadata[], array2: QortalMetadata[]) => {
  const mergedArray = [...array1, ...array2];

  // Use a Map to ensure uniqueness based on `identifier-name`
  const uniqueMap = new Map();

  mergedArray.forEach(item => {
    if (item.identifier && item.name && item.service) {
      const key = `${item.service}-${item.name}-${item.identifier}`;
      uniqueMap.set(key, item);
    }
  });

  return Array.from(uniqueMap.values()); // Return the unique values
};

export interface ListItem {
  data?: any
  qortalMetadata: QortalMetadata
}


interface resourceCache {
    [id: string]: {
      data: ListItem | false | null; // Cached resource data
      expiry: number; // Expiry timestamp in milliseconds
    };
  }

interface CacheState {
  resourceCache: resourceCache;

  searchCache: SearchCache;
  // Search cache actions
  setResourceCache: (id: string, data: ListItem | false | null, customExpiry?: number) => void;

  setSearchCache: (searchTerm: string, data: QortalMetadata[], customExpiry?: number) => void;
  getSearchCache: (searchTerm: string) => QortalMetadata[] | null;
  clearExpiredCache: () => void;
  getResourceCache: (id: string, ignoreExpire?: boolean) => ListItem | false | null;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  resourceCache: {},
  searchCache: {},
  orderCache: {},
  messageCache: {},

  getResourceCache: (id, ignoreExpire) => {
    const cache = get().resourceCache[id];
    if (cache && (cache.expiry > Date.now() || ignoreExpire)) {
      return cache.data; // Return cached product if not expired
    }
    return null; // Cache expired or doesn't exist
  },
  setResourceCache: (id, data, customExpiry) =>
    set((state) => {
      const expiry = Date.now() + (customExpiry || (30 * 60 * 1000)); // 30mins from now
      return {
        resourceCache: {
          ...state.resourceCache,
          [id]: { data, expiry },
        },
      };
    }),
  // Add search results to cache
  setSearchCache: (searchTerm, data, customExpiry) =>
    set((state) => {
      const expiry = Date.now() + (customExpiry || (5 * 60 * 1000)); // 5mins from now
      return {
        searchCache: {
          ...state.searchCache,
          [searchTerm]: { data, expiry },
        },
      };
    }),

  // Retrieve cached search results
  getSearchCache: (searchTerm) => {
    const cache = get().searchCache[searchTerm];
    if (cache && cache.expiry > Date.now()) {
      return cache.data; // Return cached search results if not expired
    }
    return null; // Cache expired or doesn't exist
  },

  // Clear expired caches 
  clearExpiredCache: () =>
    set((state) => {
      const now = Date.now();
      // Filter expired searches
      const validSearchCache = Object.fromEntries(
        Object.entries(state.searchCache).filter(
          ([, value]) => value.expiry > now
        )
      );
      return {
        searchCache: validSearchCache,
      };
    }),
}));
