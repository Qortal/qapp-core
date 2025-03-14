import { create } from "zustand";
import { QortalMetadata } from "../types/interfaces/resources";


interface SearchCache {
  [listName: string]: {
    searches: {
      [searchTerm: string]: QortalMetadata[]; // List of products for each search term
    };
    temporaryNewResources: QortalMetadata[],
    expiry: number; // Expiry timestamp for the whole list
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

  setSearchCache: (listName: string, searchTerm: string, data: QortalMetadata[], customExpiry?: number) => void;
  getSearchCache: (listName: string, searchTerm: string) => QortalMetadata[] | null;
  clearExpiredCache: () => void;
  getResourceCache: (id: string, ignoreExpire?: boolean) => ListItem | false | null;
  addTemporaryResource: (listName: string, newResources: QortalMetadata[], customExpiry?: number)=> void;
  getTemporaryResources:(listName: string)=> QortalMetadata[]
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
  setSearchCache: (listName, searchTerm, data, customExpiry) =>
    set((state) => {
      const expiry = Date.now() + (customExpiry || 5 * 60 * 1000); // 5mins from now
  
      return {
        searchCache: {
          ...state.searchCache,
          [listName]: {
            searches: {
              ...(state.searchCache[listName]?.searches || {}), // Preserve existing searches
              [searchTerm]: data, // Store new search term results
            },
            temporaryNewResources: state.searchCache[listName]?.temporaryNewResources || [], // Preserve existing temp resources
            expiry, // Expiry for the entire list
          },
        },
      };
    }),
  

  // Retrieve cached search results
  getSearchCache: (listName, searchTerm) => {
    const cache = get().searchCache[listName];
    if (cache && cache.expiry > Date.now()) {
      return cache.searches[searchTerm] || null; // Return specific search term results
    }
    return null; // Cache expired or doesn't exist
  },
  addTemporaryResource: (listName, newResources, customExpiry) =>
    set((state) => {
      const expiry = Date.now() + (customExpiry || 5 * 60 * 1000); // Reset expiry
  
      const existingResources = state.searchCache[listName]?.temporaryNewResources || [];
  
      // Merge and remove duplicates, keeping the latest by `created` timestamp
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
            temporaryNewResources: Array.from(uniqueResourcesMap.values()), // Store unique items
            expiry, // Reset expiry
          },
        },
      };
    }),
    getTemporaryResources: (listName: string) => {
      const cache = get().searchCache[listName];
      if (cache && cache.expiry > Date.now()) {
        return cache.temporaryNewResources || [];
      }
      return []; // Return empty array if expired or doesn't exist
    },
  // Clear expired caches 
  clearExpiredCache: () =>
    set((state) => {
      const now = Date.now();
      const validSearchCache = Object.fromEntries(
        Object.entries(state.searchCache).filter(
          ([, value]) => value.expiry > now // Only keep unexpired lists
        )
      );
      return {
        searchCache: validSearchCache,
      };
    }),
}));
