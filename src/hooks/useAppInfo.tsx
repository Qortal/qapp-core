import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "../state/auth";
import { useAppStore } from "../state/app";
import { EnumCollisionStrength, hashWord } from "../utils/encryption";

export const useAppInfo = (appName?: string, publicSalt?: string) => {
  const setAppState = useAppStore((state) => state.setAppState);
  const appNameHashed = useAppStore((state) => state.appNameHashed);

  const handleAppInfoSetup = useCallback(async (name: string, salt: string) => {
    const appNameHashed = await hashWord(
      name,
      EnumCollisionStrength.HIGH,
      salt
    );
    setAppState({
      appName: name,
      publicSalt: salt,
      appNameHashed,
    });
  }, []);

  useEffect(() => {
    if (appName && publicSalt) {
      handleAppInfoSetup(appName, publicSalt);
    }
  }, [appName, publicSalt, handleAppInfoSetup]);
  return useMemo(
    () => ({
      appName,
      appNameHashed,
    }),
    [appName, appNameHashed]
  );
};
