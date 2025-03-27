import React, { useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "../state/app";
import { EnumCollisionStrength, hashWord } from "../utils/encryption";


export const useLocalStorage = (publicSalt: string, appName: string) => {


  const setTimestamp = useCallback(async (timestamp: number, storageId: string)=> {
      const hashedString = await hashWord(`${appName}-${storageId}`, EnumCollisionStrength.HIGH, publicSalt)
      localStorage.setItem(hashedString, JSON.stringify(timestamp));
      return true
  }, [appName, publicSalt])

  const getTimestamp = useCallback(async ( storageId: string)=> {
    const hashedString = await hashWord(`${appName}-${storageId}`, EnumCollisionStrength.HIGH, publicSalt)
    const stored = localStorage.getItem(hashedString);
    if(stored){
      return JSON.parse(stored)
    } else return null
  }, [appName, publicSalt])

  const isNewTimestamp = useCallback(async( storageId: string, differenceTimestamp: number)=> {
      const hashedString = await hashWord(`${appName}-${storageId}`, EnumCollisionStrength.HIGH, publicSalt)
      const stored = localStorage.getItem(hashedString);
      if(stored){
        const storedTimestamp = JSON.parse(stored)
        return (Date.now() - storedTimestamp) > differenceTimestamp
      } else return true
  }, [appName, publicSalt])
  return {
    setTimestamp,
    getTimestamp,
    isNewTimestamp
   
  };
};
