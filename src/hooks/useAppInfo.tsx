import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "../state/auth";
import { useAppStore } from "../state/app";
import { EnumCollisionStrength, hashWord } from "../utils/encryption";


export const useAppInfo = (appName?: string, publicSalt?: string) => {
  const setAppState = useAppStore().setAppState
  const appNameHashed = useMemo(()=> {
    if(!appName) return ""

  }, [appName])

  const handleAppInfoSetup = useCallback(async (name: string, salt: string)=> {
    const appNameHashed = await hashWord(name, EnumCollisionStrength.LOW, salt)
    setAppState({
      appName: name,
      publicSalt: salt,
      appNameHashed
    })
  }, [])

  useEffect(()=> {
    if(appName && publicSalt){
      handleAppInfoSetup(appName, publicSalt)
    }
  }, [appName, publicSalt, handleAppInfoSetup])
  return {
    appName,
    appNameHashed
  };
};
