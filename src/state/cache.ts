import { create } from "zustand";
import { QortalMetadata } from "../types/interfaces/resources";
import { persist } from "zustand/middleware";


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

  interface DeletedResources {
    [key: string]: { deleted: true; expiry: number }; // ✅ Added expiry field
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
  deletedResources: DeletedResources;
  markResourceAsDeleted: (item: QortalMetadata) => void;
  filterOutDeletedResources: (items: QortalMetadata[]) => QortalMetadata[];
  isListExpired: (listName: string)=> boolean
}

export const useCacheStore = create<CacheState>
    ((set, get) => ({
      resourceCache: {},
      searchCache: {},
      deletedResources: {},

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
          const expiry = Date.now() + (customExpiry || 30 * 60 * 1000); // 30 mins
          return {
            resourceCache: {
              ...state.resourceCache,
              [id]: { data, expiry },
            },
          };
        }),

      setSearchCache: (listName, searchTerm, data, customExpiry) =>
        set((state) => {
          const expiry = Date.now() + (customExpiry || 5 * 60 * 1000); // 5 mins

          return {
            searchCache: {
              ...state.searchCache,
              [listName]: {
                searches: {
                  ...(state.searchCache[listName]?.searches || {}),
                  [searchTerm]: data,
                },
                temporaryNewResources: state.searchCache[listName]?.temporaryNewResources || [],
                expiry,
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

          const existingResources = state.searchCache[listName]?.temporaryNewResources || [];

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
          return cache.temporaryNewResources || [];
        }
        return [];
      },

      markResourceAsDeleted: (item) =>
        set((state) => {
          const now = Date.now();
          const expiry = now + 5 * 60 * 1000; // ✅ Expires in 5 minutes
      
          // ✅ Remove expired deletions before adding a new one
          const validDeletedResources = Object.fromEntries(
            Object.entries(state.deletedResources).filter(([_, value]) => value.expiry > now)
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
          (item) => !deletedResources[`${item.service}-${item.name}-${item.identifier}`]
        );
      },
      isListExpired: (listName: string): boolean => {
        const cache = get().searchCache[listName];
        return cache ? cache.expiry <= Date.now() : true; // ✅ Expired if expiry timestamp is in the past
      },
      

      clearExpiredCache: () =>
        set((state) => {
          const now = Date.now();
          const validSearchCache = Object.fromEntries(
            Object.entries(state.searchCache).filter(([, value]) => value.expiry > now)
          );
          return { searchCache: validSearchCache };
        }),
    }),
 
);