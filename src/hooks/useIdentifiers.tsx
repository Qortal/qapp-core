import React, { useCallback, useMemo } from "react";
import {
  buildIdentifier,
  buildSearchPrefix,
  EnumCollisionStrength,
  hashWord,
} from "../utils/encryption";

export const useIdentifiers = (publicSalt: string, appName: string) => {
  const buildIdentifierFunc = useCallback(
    (entityType: string, parentId: string | null) => {
      return buildIdentifier(appName, publicSalt, entityType, parentId);
    },
    [appName, publicSalt]
  );

  const buildSearchPrefixFunc = useCallback(
    (entityType: string, parentId: string | null) => {
      return buildSearchPrefix(appName, publicSalt, entityType, parentId);
    },
    [appName, publicSalt]
  );

  const createSingleIdentifier = useCallback(
    async (partialIdentifier: string) => {
      const appNameHashed = await hashWord(
        appName,
        EnumCollisionStrength.HIGH,
        publicSalt
      );
      return appNameHashed + "_" + partialIdentifier;
    },
    [appName, publicSalt]
  );

  const hashQortalName = useCallback(
    async (qortalName: string) => {
      const hashedQortalName = await hashWord(
        qortalName,
        EnumCollisionStrength.HIGH,
        publicSalt
      );
      return hashedQortalName;
    },
    [publicSalt]
  );

  const hashString = useCallback(
    async (string: string, strength: EnumCollisionStrength) => {
      const hashedQortalName = await hashWord(string, strength, publicSalt);
      return hashedQortalName;
    },
    [publicSalt]
  );

  return useMemo(
    () => ({
      buildIdentifier: buildIdentifierFunc,
      buildSearchPrefix: buildSearchPrefixFunc,
      createSingleIdentifier,
      hashQortalName,
      hashString,
    }),
    [
      buildIdentifierFunc,
      buildSearchPrefixFunc,
      createSingleIdentifier,
      hashQortalName,
      hashString,
    ]
  );
};
