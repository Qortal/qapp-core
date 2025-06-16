import React, { useMemo } from "react";
import { useListStore } from "../state/lists";
import { useCacheStore } from "../state/cache"; // Assuming you export getResourceCache
import {  QortalMetadata } from "../types/interfaces/resources";

export function useListReturn(listName: string): QortalMetadata[] {
  const list = useListStore((state) => state.lists[listName]?.items) || [];
    const filterOutDeletedResources = useCacheStore((s) => s.filterOutDeletedResources);
  const deletedResources = useCacheStore((s) => s.deletedResources);
    const temporaryResources = useCacheStore().getTemporaryResources(listName)
  
    const listToDisplay = useMemo(()=> {
      return filterOutDeletedResources([...temporaryResources, ...(list || [])])
    }, [list, listName, deletedResources, temporaryResources])
  return listToDisplay
}
