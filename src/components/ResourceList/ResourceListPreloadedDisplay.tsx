import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  QortalMetadata,
} from "../../types/interfaces/resources";
import { VirtualizedList } from "../../common/VirtualizedList";
import { ListLoader } from "../../common/ListLoader";
import { ListItem, useCacheStore } from "../../state/cache";
import { ResourceLoader } from "./ResourceLoader";
import { ItemCardWrapper } from "./ItemCardWrapper";
import { Spacer } from "../../common/Spacer";
import { useListStore } from "../../state/lists";
import { useScrollTracker } from "../../common/useScrollTracker";
import { HorizontalPaginatedList } from "./HorizontalPaginationList";
import { VerticalPaginatedList } from "./VerticalPaginationList";
import { useIdentifiers } from "../../hooks/useIdentifiers";
import { useGlobal } from "../../context/GlobalProvider";
import { useScrollTrackerRef } from "../../common/useScrollTrackerRef";
type Direction = "VERTICAL" | "HORIZONTAL";

interface ResourceListStyles {
  gap?: number;
  listLoadingHeight?: CSSProperties;
  disabledVirutalizationStyles?: {
    parentContainer?: CSSProperties;
  };
  horizontalStyles?: {
    minItemWidth?: number
  }
}

interface EntityParams {
  entityType: string;
  parentId?: string | null;
}



export interface DefaultLoaderParams {
  listLoadingText?: string;
  listNoResultsText?: string;
  listItemLoadingText?: string;
  listItemErrorText?: string;
}

export type ReturnType = 'JSON' | 'BASE64'

export interface Results {
  resourceItems: QortalMetadata[]
  isLoadingList: boolean
}

interface BaseProps  {
  listOfResources: QortalMetadata[];
  listItem: (item: ListItem, index: number) => React.ReactNode;
  styles?: ResourceListStyles;
  loaderItem?: (status: "LOADING" | "ERROR") => React.ReactNode;
  defaultLoaderParams?: DefaultLoaderParams;
  loaderList?: (status: "LOADING" | "NO_RESULTS") => React.ReactNode;
  disableVirtualization?: boolean;
  onSeenLastItem?: (listItem: QortalMetadata) => void;
  listName: string,
  children?: React.ReactNode;
  searchCacheDuration?: number
  resourceCacheDuration?: number
  disablePagination?: boolean
  disableScrollTracker?: boolean
  retryAttempts?: number
  returnType: 'JSON' | 'BASE64'
  onResults?: (results: Results)=> void
  onNewData?: (hasNewData: boolean) => void;
  ref?: any
  scrollerRef?: React.RefObject<HTMLElement | null> | null,
  limit: number
}

const defaultStyles = {
  gap: 1
}

// ✅ Restrict `direction` only when `disableVirtualization = false`
interface VirtualizedProps extends BaseProps {
  disableVirtualization?: false;
  direction?: "VERTICAL"; // Only allow "VERTICAL" when virtualization is enabled
}

interface NonVirtualizedProps extends BaseProps {
  disableVirtualization: true;
  direction?: Direction; // Allow both "VERTICAL" & "HORIZONTAL" when virtualization is disabled
}

type PropsResourceListDisplay = VirtualizedProps | NonVirtualizedProps;


export const MemorizedComponent = ({
  ///
  listOfResources,
  ///
  listItem,
  limit,
  styles = defaultStyles,
  defaultLoaderParams,
  loaderItem,
  loaderList,
  disableVirtualization,
  direction = "VERTICAL",
  onSeenLastItem,
  listName,
  searchCacheDuration,
  resourceCacheDuration,
  disablePagination,
  disableScrollTracker,
  returnType = 'JSON',
  retryAttempts = 2,
  onResults,
  onNewData,
  ref,
  scrollerRef
}: PropsResourceListDisplay)  => {
  const { lists} = useGlobal()


  const temporaryResources = useCacheStore().getTemporaryResources(listName)
  const list = useListStore((state) => state.lists[listName]?.items) || [];
  const [isLoading, setIsLoading] = useState(list?.length > 0 ? false : true);

  const isListExpired = useCacheStore().isListExpired(listName)
  const isListExpiredRef = useRef<boolean | string>(true)
  useEffect(()=> {
    isListExpiredRef.current = isListExpired
  }, [isListExpired])

  const filterOutDeletedResources = useCacheStore((s) => s.filterOutDeletedResources);
const deletedResources = useCacheStore((s) => s.deletedResources);

const addList = useListStore((s) => s.addList);
const removeFromList = useListStore((s) => s.removeFromList);
const addItems = useListStore((s) => s.addItems);



  const lastItemTimestampRef = useRef<null | number>(null)

  useEffect(()=> {
    if(list?.length > 0){
      lastItemTimestampRef.current = list[0]?.created || null
    }
  }, [list])

 




  

  const getResourceList = useCallback(async () => {
    try {
      if(listOfResources?.length === 0){
        setIsLoading(false);
        return
      }
      setIsLoading(true);
      await new Promise((res)=> {
        setTimeout(() => {
          res(null)
        }, 500);
      })
    
      lastItemTimestampRef.current = null
      const parsedParams = {limit, offset: 0};
      const responseData = await lists.fetchPreloadedResources(parsedParams, listOfResources, listName, returnType, true); // Awaiting the async function
        addList(listName,  responseData || []);
        if(onNewData){
          onNewData(false)
        }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [listOfResources, lists.fetchPreloadedResources]); // Added dependencies for re-fetching

  const resetSearch = useCallback(async ()=> {
    lists.deleteList(listName);
   getResourceList()
 }, [listName, getResourceList])

 useEffect(()=> {
   if(ref){
     ref.current = {resetSearch}
   }
 }, [resetSearch])
  useEffect(() => {
    if(!listName || listOfResources?.length === 0){
      if(listName){
        setIsLoading(false)
      }

      return
    }
    const isExpired = useCacheStore.getState().isListExpired(listName);
      if(typeof isExpired === 'string') {
         setIsLoading(false)
        return
      }
    sessionStorage.removeItem(`scroll-position-${listName}`);
    getResourceList();
  }, [getResourceList, listName, listOfResources, limit]); 

  const {elementRef} = useScrollTracker(listName, list?.length > 0, scrollerRef ? true : !disableVirtualization ? true : disableScrollTracker);
  useScrollTrackerRef(listName, list?.length > 0,  scrollerRef)
  const setSearchCacheExpiryDuration = useCacheStore((s) => s.setSearchCacheExpiryDuration);
const setResourceCacheExpiryDuration = useCacheStore((s) => s.setResourceCacheExpiryDuration);

    useEffect(()=> {
      if(searchCacheDuration){
          setSearchCacheExpiryDuration(searchCacheDuration)
      }
    }, [])
    useEffect(()=> {
      if(resourceCacheDuration){
          setResourceCacheExpiryDuration(resourceCacheDuration)
      }
    }, [])
  const listToDisplay = useMemo(()=> {
    return filterOutDeletedResources([...temporaryResources, ...(list || [])])
  }, [list, listName, deletedResources, temporaryResources])

  useEffect(()=> {
    if(onResults){
      onResults({
        resourceItems: listToDisplay,
        isLoadingList: isLoading
      })
    }
  }, [listToDisplay, onResults, isLoading])


  const getResourceMoreList = useCallback(async (displayLimit?: number) => {
    try {
      if(listOfResources.length === 0 || limit === 0) return
       
      const parsedParams = {limit, offset: listToDisplay?.length + (limit || 20)};

   
      const responseData = await lists.fetchPreloadedResources(parsedParams, listOfResources, listName, returnType); // Awaiting the async function
      addItems(listName, responseData || [])
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } 
  }, [listOfResources, listName, limit, listToDisplay]); 



  const disabledVirutalizationStyles: CSSProperties = useMemo(() => {
    if (styles?.disabledVirutalizationStyles?.parentContainer)
      return styles?.disabledVirutalizationStyles.parentContainer;
    return {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: `${styles.gap}px` || 0,
      width: "100%",
    };
  }, [styles?.disabledVirutalizationStyles, styles?.gap, direction]);

  useEffect(() => {
    const clearOnReload = () => {
      sessionStorage.removeItem(`scroll-position-${listName}`);
    };

    window.addEventListener("beforeunload", clearOnReload);
    return () => window.removeEventListener("beforeunload", clearOnReload);
  }, [listName]);


  const renderListItem = useCallback((item: ListItem, index: number) => {
    return listItem(item, index);
  }, [ listItem]);

  const onLoadLess = useCallback((displayLimit: number)=> {
removeFromList(listName, displayLimit)
  }, [removeFromList])
    const onLoadMore = useCallback((displayLimit: number)=> {
getResourceMoreList(displayLimit)
  }, [getResourceMoreList])



  return (
    <div ref={elementRef} style={{
      width: '100%',
      height: disableVirtualization ? 'auto' : '100%'
    }}>
    <ListLoader
      noResultsMessage={
        defaultLoaderParams?.listNoResultsText || "No results available"
      }
      resultsLength={listToDisplay?.length}
      isLoading={isLoading}
      loadingMessage={
        defaultLoaderParams?.listLoadingText || "Retrieving list. Please wait."
      }
      loaderList={loaderList}
      loaderHeight={styles?.listLoadingHeight}
    >
      <div
      
        style={{
          height: disableVirtualization ? 'auto' : "100%",
          display: "flex",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexGrow: 1 }}>
          {!disableVirtualization && (
            <VirtualizedList listName={listName} list={listToDisplay} onSeenLastItem={(item)=> {
              getResourceMoreList()
              if(onSeenLastItem){
                onSeenLastItem(item)
              }
            }}>
              {(item: QortalMetadata, index: number) => (
                <>
                  {styles?.gap && <Spacer height={`${styles.gap / 2}px`} />}
                  <Spacer />
                  <ListItemWrapper
                    defaultLoaderParams={defaultLoaderParams}
                    item={item}
                    index={index}
                    render={renderListItem}
                    renderListItemLoader={loaderItem}
                  />
                  {styles?.gap && <Spacer height={`${styles.gap / 2}px`} />}
                </>
              )}
            </VirtualizedList>
          )}
          {disableVirtualization && direction === "HORIZONTAL" && (
            <>
             <HorizontalPaginatedList defaultLoaderParams={defaultLoaderParams} disablePagination={disablePagination} limit={limit || 20} onLoadLess={onLoadLess}  items={listToDisplay} listItem={renderListItem} onLoadMore={onLoadMore} gap={styles?.gap} minItemWidth={styles?.horizontalStyles?.minItemWidth} loaderItem={loaderItem} />
            </>
            
          )}
          {disableVirtualization && direction === "VERTICAL" && (
            <div style={disabledVirutalizationStyles}>
              <VerticalPaginatedList disablePagination={disablePagination} limit={limit || 20} onLoadLess={(displayLimit)=> {

              removeFromList(listName, displayLimit)
             }} defaultLoaderParams={defaultLoaderParams} items={listToDisplay} listItem={renderListItem} onLoadMore={(displayLimit)=> getResourceMoreList(displayLimit)} loaderItem={loaderItem} />
            </div>
          )}
        </div>
      </div>
    </ListLoader>
    </div>
  );
}


function arePropsEqual(
  prevProps: PropsResourceListDisplay,
  nextProps: PropsResourceListDisplay
): boolean {
  return (
    prevProps.listName === nextProps.listName &&
    prevProps.disableVirtualization === nextProps.disableVirtualization &&
    prevProps.direction === nextProps.direction &&
    prevProps.onSeenLastItem === nextProps.onSeenLastItem &&
    JSON.stringify(prevProps.styles) === JSON.stringify(nextProps.styles) &&
    prevProps.listItem === nextProps.listItem
  );
}

export const ResourceListPreloadedDisplay = React.memo(MemorizedComponent, arePropsEqual);

interface ListItemWrapperProps {
  item: QortalMetadata;
  index: number;
  render: (item: ListItem, index: number) => React.ReactNode;
  defaultLoaderParams?: DefaultLoaderParams;
  renderListItemLoader?: (status: "LOADING" | "ERROR") => React.ReactNode;
}

export const ListItemWrapper: React.FC<ListItemWrapperProps> = ({
  item,
  index,
  render,
  defaultLoaderParams,
  renderListItemLoader,
}) => {
const resourceKey = `${item.service}-${item.name}-${item.identifier}`;

const entry = useCacheStore((s) => s.resourceCache[resourceKey]);
const [validResource, setValidResource] = useState(entry?.data ?? null);

useEffect(() => {
  if (!entry) return setValidResource(null);

  if (entry.expiry > Date.now()) {
    setValidResource(entry.data);
  } else {
    useCacheStore.setState((s) => {
      const newCache = { ...s.resourceCache };
      delete newCache[resourceKey];
      return { resourceCache: newCache };
    });
    setValidResource(null);
  }
}, [entry, resourceKey]);

  if (validResource === null && !renderListItemLoader)
    return (
      <ItemCardWrapper height={60} isInCart={false}>
        <ResourceLoader
          message={
            defaultLoaderParams?.listItemLoadingText || "Fetching Data..."
          }
          status="loading"
        />
      </ItemCardWrapper>
    );
  if (validResource === false && !renderListItemLoader)
    return (
      <ItemCardWrapper height={60} isInCart={false}>
        <ResourceLoader
          message={
            defaultLoaderParams?.listItemErrorText ||
            "Resource is unavailble at this moment... Try again later."
          }
          status="error"
        />
      </ItemCardWrapper>
    );
  if (
    renderListItemLoader &&
    (validResource === false || validResource === null)
  ) {
    return renderListItemLoader(
      validResource === null ? "LOADING" : "ERROR"
    );
  }

  // Example transformation (Modify item if needed)
  const transformedItem = validResource
    ? validResource
    : { qortalMetadata: item, data: null };

  return <>{render(transformedItem, index)}</>;
};
