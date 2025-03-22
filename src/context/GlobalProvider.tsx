import React, { createContext, useContext, useMemo } from "react";
import { useAuth, UseAuthProps } from "../hooks/useAuth";
import { useResources } from "../hooks/useResources";
import { useAppInfo } from "../hooks/useAppInfo";
import { addAndEncryptSymmetricKeys, decryptWithSymmetricKeys, encryptWithSymmetricKeys, IdentifierBuilder } from "../utils/encryption";
import { useIdentifiers } from "../hooks/useIdentifiers";
import { objectToBase64 } from "../utils/base64";
import { base64ToObject } from "../utils/publish";


const utils = {
  objectToBase64,
  base64ToObject,
  addAndEncryptSymmetricKeys,
  encryptWithSymmetricKeys,
  decryptWithSymmetricKeys
}


// ✅ Define Global Context Type
interface GlobalContextType {
  auth: ReturnType<typeof useAuth>;
lists: ReturnType<typeof useResources>;
appInfo: ReturnType<typeof useAppInfo>;
identifierOperations: ReturnType<typeof useIdentifiers>
utils: typeof utils
}


// ✅ Define Config Type for Hook Options
interface GlobalProviderProps {
  children: React.ReactNode;
  config: {
    /** Authentication settings. */
    auth?: UseAuthProps;
    appName: string;
    publicSalt: string
  };
  identifierBuilder?: IdentifierBuilder
}

// ✅ Create Context with Proper Type
const GlobalContext = createContext<GlobalContextType | null>(null);



// 🔹 Global Provider (Handles Multiple Hooks)
export const GlobalProvider = ({ children, config, identifierBuilder }: GlobalProviderProps) => {
  // ✅ Call hooks and pass in options dynamically
  const auth = useAuth(config?.auth || {});
  const appInfo = useAppInfo(config?.appName, config?.publicSalt)
  const lists = useResources()
  const identifierOperations = useIdentifiers(identifierBuilder, config?.publicSalt)

  // ✅ Merge all hooks into a single `contextValue`
  const contextValue = useMemo(() => ({ auth, lists, appInfo, identifierOperations, utils }), [auth, lists, appInfo, identifierOperations]);
  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

// 🔹 Hook to Access Global Context
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return context;
};
