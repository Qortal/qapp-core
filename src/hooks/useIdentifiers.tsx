import { useCallback, useMemo } from 'react';
import {
  buildIdentifier,
  buildLooseIdentifier,
  buildLooseSearchPrefix,
  buildSearchPrefix,
  EnumCollisionStrength,
  hashWord,
} from '../utils/encryption';

export const useIdentifiers = (publicSalt: string, appName: string) => {
  const buildIdentifierFunc = useCallback(
    (
      entityType: string,
      parentId: string | null,
      noUniqueId?: boolean,
      preEntity?: string
    ) => {
      return buildIdentifier(
        appName,
        publicSalt,
        entityType,
        parentId,
        noUniqueId,
        preEntity
      );
    },
    [appName, publicSalt]
  );

  const buildIdentifierFromRawFunc = useCallback(
    (
      appNameFromExternal: string,
      publicSaltFromExternal: string,
      entityType: string,
      parentId: string | null,
      noUniqueId?: boolean,
      preEntity?: string
    ) => {
      return buildIdentifier(
        appNameFromExternal,
        publicSaltFromExternal,
        entityType,
        parentId,
        noUniqueId,
        preEntity
      );
    },
    []
  );

  const buildSearchPrefixFunc = useCallback(
    (
      entityType: string | null,
      parentId: string | null,
      preEntity?: string
    ) => {
      return buildSearchPrefix(
        appName,
        publicSalt,
        entityType,
        parentId,
        preEntity
      );
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
      return appNameHashed + '_' + partialIdentifier;
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
    async (
      string: string,
      strength: EnumCollisionStrength,
      customPublicSalt?: string
    ) => {
      const hashedQortalName = await hashWord(
        string,
        strength,
        customPublicSalt || publicSalt
      );
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
      buildLooseSearchPrefix,
      buildLooseIdentifier,
      buildIdentifierFromRaw: buildIdentifierFromRawFunc,
    }),
    [
      buildIdentifierFunc,
      buildSearchPrefixFunc,
      createSingleIdentifier,
      hashQortalName,
      hashString,
      buildIdentifierFromRawFunc,
    ]
  );
};
