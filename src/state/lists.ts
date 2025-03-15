import {create} from "zustand";
import { QortalMetadata } from "../types/interfaces/resources";
import { persist } from "zustand/middleware";


interface ListsState {
  [listName: string]: {
    name: string;
    items: QortalMetadata[]; // ✅ Items are stored as an array
  };
}

interface ListStore {
  lists: ListsState;

  // CRUD Operations
  addList: (name: string, items: QortalMetadata[]) => void;
  addItem: (listName: string, item: QortalMetadata) => void;
  addItems: (listName: string, items: QortalMetadata[]) => void; 
  updateItem: (listName: string, item: QortalMetadata) => void;
  deleteItem: (listName: string, itemKey: string) => void;
  deleteList: (listName: string) => void;

  // Getter function
  getListByName: (listName: string) => QortalMetadata[]
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: {},

  addList: (name, items) =>
    set((state) => ({
      lists: {
        ...state.lists,
        [name]: { name, items }, // ✅ Store items as an array
      },
    })),

  addItem: (listName, item) =>
    set((state) => {
      if (!state.lists[listName]) return state; // Exit if list doesn't exist

      const itemKey = `${item.name}-${item.service}-${item.identifier}`;
      const existingItem = state.lists[listName].items.find(
        (existing) => `${existing.name}-${existing.service}-${existing.identifier}` === itemKey
      );

      if (existingItem) return state; // Avoid duplicates

      return {
        lists: {
          ...state.lists,
          [listName]: {
            ...state.lists[listName],
            items: [...state.lists[listName].items, item], // ✅ Add to array
          },
        },
      };
    }),
    addItems: (listName, items) =>
        set((state) => {
      
          if (!state.lists[listName]) {
            console.warn(`List "${listName}" does not exist. Creating a new list.`);
            return {
              lists: {
                ...state.lists,
                [listName]: { name: listName, items: [...items] }, // ✅ Create new list if missing
              },
            };
          }
      
          // ✅ Generate existing keys correctly
          const existingKeys = new Set(
            state.lists[listName].items.map(
              (item) => `${item.name}-${item.service}-${item.identifier}`
            )
          );
      
      
          // ✅ Ensure we correctly compare identifiers
          const newItems = items.filter((item) => {
            const itemKey = `${item.name}-${item.service}-${item.identifier}`;
            const isDuplicate = existingKeys.has(itemKey);
      
            return !isDuplicate; // ✅ Only keep items that are NOT in the existing list
          });
      
      
          if (newItems.length === 0) {
            console.warn("No new items were added because they were all considered duplicates.");
            return state; // ✅ Prevent unnecessary re-renders if no changes
          }
      
          return {
            lists: {
              ...state.lists,
              [listName]: {
                ...state.lists[listName],
                items: [...state.lists[listName].items, ...newItems], // ✅ Append only new items
              },
            },
          };
        }),
      
  updateItem: (listName, item) =>
    set((state) => {
      if (!state.lists[listName]) return state;

      const itemKey = `${item.name}-${item.service}-${item.identifier}`;

      return {
        lists: {
          ...state.lists,
          [listName]: {
            ...state.lists[listName],
            items: state.lists[listName].items.map((existing) =>
              `${existing.name}-${existing.service}-${existing.identifier}` === itemKey
                ? item // ✅ Update item
                : existing
            ),
          },
        },
      };
    }),

  deleteItem: (listName, itemKey) =>
    set((state) => {
      if (!state.lists[listName]) return state;

      return {
        lists: {
          ...state.lists,
          [listName]: {
            ...state.lists[listName],
            items: state.lists[listName].items.filter(
              (item) => `${item.name}-${item.service}-${item.identifier}` !== itemKey
            ), // ✅ Remove from array
          },
        },
      };
    }),

  deleteList: (listName) =>
    set((state) => {
      if (!state.lists[listName]) return state;

      const updatedLists = { ...state.lists };
      delete updatedLists[listName];

      return { lists: updatedLists };
    }),

  getListByName: (listName) => get().lists[listName]?.items || [], // ✅ Get a list by name
}));
