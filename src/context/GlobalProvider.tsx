import React, { createContext, useContext, useMemo } from "react";
import { useAuth, UseAuthProps } from "../hooks/useAuth";
import { useResources } from "../hooks/useResources";


// ✅ Define Global Context Type
interface GlobalContextType {
  auth: ReturnType<typeof useAuth>;
resources: ReturnType<typeof useResources>;
}

// ✅ Define Config Type for Hook Options
interface GlobalProviderProps {
  children: React.ReactNode;
  config?: {
    /** Authentication settings. */
    auth?: UseAuthProps;
  };
}

// ✅ Create Context with Proper Type
const GlobalContext = createContext<GlobalContextType | null>(null);

// 🔹 Global Provider (Handles Multiple Hooks)
export const GlobalProvider = ({ children, config }: GlobalProviderProps) => {
  // ✅ Call hooks and pass in options dynamically
  const auth = useAuth(config?.auth || {});
  const resources = useResources()

  // ✅ Merge all hooks into a single `contextValue`
  const contextValue = useMemo(() => ({ auth, resources }), [auth, resources]);

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
