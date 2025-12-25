import { useCallback, useMemo } from 'react';
import { useListStore } from '../state/lists';
import { useCacheStore } from '../state/cache';

export const useBlockedNames = () => {
  const filterOutItemsByNames = useListStore(
    (state) => state.filterOutItemsByNames
  );
  const filterSearchCacheItemsByNames = useCacheStore(
    (s) => s.filterSearchCacheItemsByNames
  );

  const addToBlockedList = useCallback(async (names: string[]) => {
    const response = await qortalRequest({
      action: 'ADD_LIST_ITEMS',
      list_name: 'blockedNames',
      items: names,
    });
    if (response === true) {
      filterOutItemsByNames(names);
      filterSearchCacheItemsByNames(names);
      return true;
    } else throw new Error('Unable to block names');
  }, []);

  const removeFromBlockedList = useCallback(async (names: string[]) => {
    const response = await qortalRequest({
      action: 'DELETE_LIST_ITEM',
      list_name: 'blockedNames',
      items: names,
    });
    if (response === true) {
      return true;
    } else throw new Error('Unable to remove blocked names');
  }, []);

  return useMemo(
    () => ({
      removeFromBlockedList,
      addToBlockedList,
    }),
    [addToBlockedList, removeFromBlockedList]
  );
};
