import React, { createContext, CSSProperties, useContext, useMemo } from "react";
import { useAuth, UseAuthProps } from "../hooks/useAuth";
import { useResources } from "../hooks/useResources";
import { useAppInfo } from "../hooks/useAppInfo";
import { useIdentifiers } from "../hooks/useIdentifiers";
import { Toaster } from "react-hot-toast";
import { useLocalStorage } from "../hooks/useLocalStorage";





// ✅ Define Global Context Type
interface GlobalContextType {
auth: ReturnType<typeof useAuth>;
lists: ReturnType<typeof useResources>;
appInfo: ReturnType<typeof useAppInfo>;
identifierOperations: ReturnType<typeof useIdentifiers>
localStorageOperations: ReturnType<typeof useLocalStorage>
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
  toastStyle: CSSProperties
}

// ✅ Create Context with Proper Type
const GlobalContext = createContext<GlobalContextType | null>(null);



// 🔹 Global Provider (Handles Multiple Hooks)
export const GlobalProvider = ({ children, config, toastStyle = {} }: GlobalProviderProps) => {
  // ✅ Call hooks and pass in options dynamically
  const auth = useAuth(config?.auth || {});
  const appInfo = useAppInfo(config.appName, config?.publicSalt)
  const lists = useResources()
  const identifierOperations = useIdentifiers(config.publicSalt, config.appName)
  const localStorageOperations = useLocalStorage(config.publicSalt, config.appName)
  // ✅ Merge all hooks into a single `contextValue`
  const contextValue = useMemo(() => ({ auth, lists, appInfo, identifierOperations, localStorageOperations }), [auth, lists, appInfo, identifierOperations, localStorageOperations]);
  return (
    <GlobalContext.Provider value={contextValue}>
       <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: toastStyle
        }}
        containerStyle={{zIndex: 999999}}
      />
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
