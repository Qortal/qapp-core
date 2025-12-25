import React, {
  createContext,
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { useAuth, UseAuthProps } from '../hooks/useInitializeAuth';
import { useResources } from '../hooks/useResources';
import { useAppInfo } from '../hooks/useAppInfo';
import { useIdentifiers } from '../hooks/useIdentifiers';
import { Toaster } from 'react-hot-toast';
import { usePersistentStore } from '../hooks/usePersistentStore';
import { IndexManager } from '../components/IndexManager/IndexManager';
import { useIndexes } from '../hooks/useIndexes';
import { useProgressStore } from '../state/video';
import { GlobalPipPlayer } from '../hooks/useGlobalPipPlayer';
import { MultiPublishDialog } from '../components/MultiPublish/MultiPublishDialog';
import { useMultiplePublishStore } from '../state/multiplePublish';
import { useIframe } from '../hooks/useIframe';

// ✅ Define Global Context Type
interface GlobalContextType {
  auth: ReturnType<typeof useAuth>;
  lists: ReturnType<typeof useResources>;
  appInfo: ReturnType<typeof useAppInfo>;
  identifierOperations: ReturnType<typeof useIdentifiers>;
  persistentOperations: ReturnType<typeof usePersistentStore>;
  indexOperations: ReturnType<typeof useIndexes>;
  enableGlobalVideoFeature: boolean;
}

// ✅ Define Config Type for Hook Options
interface GlobalProviderProps {
  children: React.ReactNode;
  config: {
    /** Authentication settings. */
    auth?: UseAuthProps;
    appName: string;
    publicSalt: string;
    enableGlobalVideoFeature?: boolean;
  };

  toastStyle?: CSSProperties;
}

// ✅ Create Context with Proper Type
export const GlobalContext = createContext<GlobalContextType | null>(null);

// 🔹 Global Provider (Handles Multiple Hooks)
export const GlobalProvider = ({
  children,
  config,
  toastStyle = {},
}: GlobalProviderProps) => {
  useIframe();
  // ✅ Call hooks and pass in options dynamically
  const auth = useAuth(config?.auth || {});
  const isPublishing = useMultiplePublishStore((s) => s.isPublishing);
  const appInfo = useAppInfo(config.appName, config?.publicSalt);
  const lists = useResources();
  const identifierOperations = useIdentifiers(
    config.publicSalt,
    config.appName
  );
  const persistentOperations = usePersistentStore(
    config.publicSalt,
    config.appName
  );
  const indexOperations = useIndexes();
  // ✅ Merge all hooks into a single `contextValue`
  const contextValue = useMemo(
    () => ({
      auth,
      lists,
      appInfo,
      identifierOperations,
      persistentOperations,
      indexOperations,
      enableGlobalVideoFeature: config?.enableGlobalVideoFeature || false,
    }),
    [
      auth,
      lists,
      appInfo,
      identifierOperations,
      persistentOperations,
      config?.enableGlobalVideoFeature,
    ]
  );
  const { clearOldProgress } = useProgressStore();

  useEffect(() => {
    clearOldProgress();
  }, []);

  return (
    <GlobalContext.Provider value={contextValue}>
      {config?.enableGlobalVideoFeature && <GlobalPipPlayer />}

      {isPublishing && <MultiPublishDialog />}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: toastStyle,
        }}
        containerStyle={{ zIndex: 999999 }}
      />
      <IndexManager username={auth?.name} />

      {children}
    </GlobalContext.Provider>
  );
};

// 🔹 Hook to Access Global Context
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
