import React, { useMemo } from "react";
import { useListStore } from "../state/lists";
import { useCacheStore } from "../state/cache"; // Assuming you export getResourceCache
import {  QortalMetadata } from "../types/interfaces/resources";

export function useListReturn(listName: string | null): QortalMetadata[] {
  // Always execute hooks, even if listName is null
  const list =
    useListStore((state) => (listName ? state.lists[listName]?.items : [])) ||
    [];

  const filterOutDeletedResources = useCacheStore(
    (s) => s.filterOutDeletedResources
  );

  const deletedResources = useCacheStore((s) => s.deletedResources);

  const getTemporaryResources = useCacheStore((s) => s.getTemporaryResources);

  const temporaryResources = listName ? getTemporaryResources(listName) : [];

  // Memo AFTER all hooks are executed
  return useMemo(() => {
    if (!listName) return [];
    const filtered = filterOutDeletedResources([
      ...temporaryResources,
      ...list,
    ]);

    // Deduplicate based on identifier, service, and name
    const seen = new Map<string, QortalMetadata>();
    filtered.forEach((item) => {
      const key = `${item.identifier}-${item.service}-${item.name}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    });

    return Array.from(seen.values());
  }, [listName, list, deletedResources, temporaryResources]);
}
