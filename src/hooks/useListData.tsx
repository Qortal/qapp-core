import React, { useMemo } from "react";
import { useListStore } from "../state/lists";
import { useCacheStore } from "../state/cache"; // Assuming you export getResourceCache
import { QortalGetMetadata } from "../types/interfaces/resources";

export function useListReturn(listName: string): QortalGetMetadata[] {
  const list = useListStore((state) => state.lists[listName]?.items) || [];
  return list
}
