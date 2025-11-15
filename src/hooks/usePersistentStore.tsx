import { useCallback, useMemo } from 'react';
import { EnumCollisionStrength, hashWord } from '../utils/encryption';
import { db } from '../utils/persistentDb';

export const usePersistentStore = (publicSalt: string, appName: string) => {
  const getHashedId = useCallback(
    async (id: string) => {
      const key = `${appName}-${id}`;
      return await hashWord(key, EnumCollisionStrength.HIGH, publicSalt);
    },
    [appName, publicSalt]
  );

  // --- TIMESTAMP FUNCTIONS ---

  const setTimestamp = useCallback(
    async (timestamp: number, storageId: string) => {
      const id = await getHashedId(storageId);
      await db.timestamps.put({ id, timestamp });
      return true;
    },
    [getHashedId]
  );

  const getTimestamp = useCallback(
    async (storageId: string) => {
      const id = await getHashedId(storageId);
      const entry = await db.timestamps.get(id);
      return entry?.timestamp ?? null;
    },
    [getHashedId]
  );

  const isNewTimestamp = useCallback(
    async (storageId: string, differenceTimestamp: number) => {
      const id = await getHashedId(storageId);
      const entry = await db.timestamps.get(id);
      if (!entry) return true;
      return Date.now() - entry.timestamp > differenceTimestamp;
    },
    [getHashedId]
  );

  // --- GENERIC CRUD FOR DYNAMIC DATA ---

  const saveData = useCallback(
    async (id: string, data: any) => {
      const hashedId = await getHashedId(id);
      await db.dynamicData.put({ id: hashedId, data });
    },
    [getHashedId]
  );

  const getData = useCallback(
    async (id: string) => {
      const hashedId = await getHashedId(id);
      const entry = await db.dynamicData.get(hashedId);
      return entry?.data ?? null;
    },
    [getHashedId]
  );

  const deleteData = useCallback(
    async (id: string) => {
      const hashedId = await getHashedId(id);
      await db.dynamicData.delete(hashedId);
    },
    [getHashedId]
  );

  const listAllData = useCallback(async () => {
    return await db.dynamicData.toArray();
  }, []);

  return useMemo(
    () => ({
      setTimestamp,
      getTimestamp,
      isNewTimestamp,
      saveData,
      getData,
      deleteData,
      listAllData,
    }),
    [
      setTimestamp,
      getTimestamp,
      isNewTimestamp,
      saveData,
      getData,
      deleteData,
      listAllData,
    ]
  );
};
