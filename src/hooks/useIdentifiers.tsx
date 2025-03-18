import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../state/auth";
import { useAppStore } from "../state/app";
import { buildIdentifier, buildSearchPrefix,  IdentifierBuilder } from "../utils/encryption";


export const useIdentifiers = (builder?: IdentifierBuilder, publicSalt?: string) => {
  const [publicSaltVal, setPublicSaltVal] = useState(publicSalt)
  
  useEffect(()=> {
    setPublicSaltVal(publicSalt)
  }, [publicSalt])
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
  

 

  useEffect(()=> {
    if(stringifiedBuilder){
      setIdentifierBuilder(JSON.parse(stringifiedBuilder))
    }
  }, [stringifiedBuilder])
  return {
    identifierBuilder,
    buildIdentifier: buildIdentifierFunc,
    buildSearchPrefix: buildSearchPrefixFunc
  };
};
