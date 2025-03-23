import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../state/auth";
import { useAppStore } from "../state/app";
import { buildIdentifier, buildSearchPrefix,  EnumCollisionStrength,  hashWord,  IdentifierBuilder } from "../utils/encryption";


export const useIdentifiers = (builder?: IdentifierBuilder, publicSalt?: string) => {
  const setIdentifierBuilder = useAppStore().setIdentifierBuilder
  const identifierBuilder = useAppStore().identifierBuilder
  const appName = useAppStore().appName

  const stringifiedBuilder = useMemo(()=> {
    return JSON.stringify(builder)
  }, [builder])

  const buildIdentifierFunc = useCallback(( entityType: string,
    parentId: string | null)=> {
      if(!appName || !publicSalt || !identifierBuilder) return null
    return buildIdentifier(appName, publicSalt, entityType, parentId, identifierBuilder)
  }, [appName, publicSalt, identifierBuilder])

  const buildSearchPrefixFunc = useCallback(( entityType: string,
    parentId: string | null)=> {
      if(!appName || !publicSalt || !identifierBuilder) return null
    return buildSearchPrefix(appName, publicSalt, entityType, parentId, identifierBuilder)
  }, [appName, publicSalt, identifierBuilder])
  
  const createSingleIdentifier = useCallback(async ( partialIdentifier: string)=> {
      if(!partialIdentifier || !appName || !publicSalt) return null
      const appNameHashed = await hashWord(appName, EnumCollisionStrength.HIGH, publicSalt)
    return appNameHashed + '_' + partialIdentifier
  }, [appName, publicSalt])

  const hashQortalName = useCallback(async ( qortalName: string)=> {
    if(!qortalName || !publicSalt) return null
    const hashedQortalName = await hashWord(qortalName, EnumCollisionStrength.HIGH, publicSalt)
  return hashedQortalName
}, [publicSalt])
 

  useEffect(()=> {
    if(stringifiedBuilder){
      setIdentifierBuilder(JSON.parse(stringifiedBuilder))
    }
  }, [stringifiedBuilder])
  return {
    buildIdentifier: buildIdentifierFunc,
    buildSearchPrefix: buildSearchPrefixFunc,
    createSingleIdentifier,
    hashQortalName
  };
};
