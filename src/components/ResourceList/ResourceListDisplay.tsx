import React, {
  CSSProperties,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  QortalMetadata,
  QortalSearchParams,
} from "../../types/interfaces/resources";
import { useResources } from "../../hooks/useResources";
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
  search: QortalSearchParams;
  entityParams?: EntityParams;
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
  searchNewData?: {
    interval: number
    intervalSearch: QortalSearchParams
  }
  onNewData?: (hasNewData: boolean) => void;
  ref?: any
  scrollerRef?: React.RefObject<HTMLElement | null>
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
  search,
  listItem,
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
  entityParams,
  returnType = 'JSON',
  retryAttempts = 2,
  onResults,
  searchNewData,
  onNewData,
  ref,
  scrollerRef
}: PropsResourceListDisplay)  => {
  const {identifierOperations, lists} = useGlobal()
  const [generatedIdentifier, setGeneratedIdentifier] = useState("")
  const [memoizedParams, setMemorizedParams] = useState('')
  const setSearchParamsForList = useCacheStore((s) => s.setSearchParamsForList);
  const memoizedParamsSearchNewData = useMemo(() => {
    if(searchNewData?.intervalSearch){
      return JSON.stringify(searchNewData?.intervalSearch)
    }
    return undefined
  }, [searchNewData?.intervalSearch]);
  const temporaryResources = useCacheStore().getTemporaryResources(listName)
  const list = useListStore((state) => state.lists[listName]?.items) || [];

  const [isLoading, setIsLoading] = useState(list?.length > 0 ? false : true);

  const isListExpired = useCacheStore().isListExpired(listName)
  const isListExpiredRef = useRef<boolean | string>(true)
  const memoizedParamsRef = useRef<string>('')
  useEffect(()=> {
    isListExpiredRef.current = isListExpired
    memoizedParamsRef.current = memoizedParams
  }, [isListExpired, memoizedParams])

  const filterOutDeletedResources = useCacheStore((s) => s.filterOutDeletedResources);
const deletedResources = useCacheStore((s) => s.deletedResources);

const addList = useListStore((s) => s.addList);
const removeFromList = useListStore((s) => s.removeFromList);
const addItems = useListStore((s) => s.addItems);



  const searchIntervalRef = useRef<any>(null)
  const lastItemTimestampRef = useRef<null | number>(null)
  const stringifiedEntityParams = useMemo(()=> {
    if(!entityParams) return null
    return JSON .stringify(entityParams)
  }, [entityParams])

  useEffect(()=> {
    if(list?.length > 0){
      lastItemTimestampRef.current = list[0]?.created || null
    }
  }, [list])

 


  useEffect(()=> {
    if(!searchNewData?.interval || !memoizedParamsSearchNewData  || !generatedIdentifier) return
    let isCalling = false
    searchIntervalRef.current = setInterval(async () => {
      
      try {
        if(!lastItemTimestampRef.current) return
        if(isCalling) return
        isCalling = true
        const parsedParams = {...(JSON.parse(memoizedParamsSearchNewData))};
        parsedParams.identifier = generatedIdentifier
        parsedParams.after = lastItemTimestampRef.current
        const responseData = await lists.fetchResourcesResultsOnly(parsedParams); // Awaiting the async function
        if(onNewData && responseData?.length > 0){
          onNewData(true)
        }
      } catch (error) {
        console.error(error)
      } finally {
        isCalling = false
      }
    }, searchNewData?.interval);

    return ()=> {
      if(searchIntervalRef.current){
        
        clearInterval(searchIntervalRef.current)
      }
    }
  }, [searchNewData?.interval, memoizedParamsSearchNewData, generatedIdentifier])


  useEffect(()=> {
    try {
      if (!search.identifier && stringifiedEntityParams) {
        const parsedEntityParams = JSON.parse(stringifiedEntityParams)
        const buildSearch = async ()=> {
         const res = await  identifierOperations.buildSearchPrefix(
            parsedEntityParams.entityType,
            parsedEntityParams.parentId || null,
          )
          if(res){
            setGeneratedIdentifier(res)
            setMemorizedParams(JSON.stringify({...search, identifier: res}))

          }
        }
    

        buildSearch()
        return
      }
      setGeneratedIdentifier(search?.identifier)
      setMemorizedParams(JSON.stringify({...search, identifier: search?.identifier}))
    } catch (error) {
      console.error(error)
    }
  }, [stringifiedEntityParams, search , identifierOperations.buildSearchPrefix])

  const getResourceList = useCallback(async () => {
    try {
      if(!generatedIdentifier) return
      setIsLoading(true);
      await new Promise((res)=> {
        setTimeout(() => {
          res(null)
        }, 500);
      })
    
      lastItemTimestampRef.current = null
      const parsedParams = {...(JSON.parse(memoizedParams))};
      const responseData = await lists.fetchResources(parsedParams, listName, returnType, true); // Awaiting the async function
        addList(listName,  responseData || []);
        if(onNewData){
          onNewData(false)
        }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedParams, generatedIdentifier, lists.fetchResources]); // Added dependencies for re-fetching

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
    if(!listName || !memoizedParams) return
    const isExpired = useCacheStore.getState().isListExpired(listName);
      if(typeof isExpired === 'string' && typeof memoizedParams=== 'string') {
        let copyMemoizedParams = {...(JSON.parse(memoizedParams))}
        delete copyMemoizedParams.after
        delete copyMemoizedParams.before
        delete copyMemoizedParams.offset
        copyMemoizedParams = JSON.stringify(copyMemoizedParams)
        if(copyMemoizedParams === isExpired){
          const copyParams = {...(JSON.parse(memoizedParams))}
        delete copyParams.after
        delete copyParams.before
        delete copyParams.offset
          setSearchParamsForList(listName, JSON.stringify(copyParams))
          setIsLoading(false)
        return
        }
        
      }
    sessionStorage.removeItem(`scroll-position-${listName}`);
    getResourceList();
  }, [getResourceList, listName]); // Runs when dependencies change

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
      if(!generatedIdentifier) return
      const parsedParams = {...(JSON.parse(memoizedParams))};
      parsedParams.before = list.length === 0 ? null : list[list.length - 1]?.created
      parsedParams.offset = null
      if(displayLimit){
        parsedParams.limit = displayLimit
      }
      const responseData = await lists.fetchResources(parsedParams, listName, returnType); // Awaiting the async function
      addItems(listName, responseData || [])
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } 
  }, [memoizedParams, listName, list]); 



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
             <HorizontalPaginatedList defaultLoaderParams={defaultLoaderParams} disablePagination={disablePagination} limit={search?.limit || 20} onLoadLess={(displayLimit)=> {
              removeFromList(listName, displayLimit)
             }}  items={listToDisplay} listItem={renderListItem} onLoadMore={(displayLimit)=> getResourceMoreList(displayLimit)} gap={styles?.gap} minItemWidth={styles?.horizontalStyles?.minItemWidth} loaderItem={loaderItem} />
            </>
            
          )}
          {disableVirtualization && direction === "VERTICAL" && (
            <div style={disabledVirutalizationStyles}>
              <VerticalPaginatedList disablePagination={disablePagination} limit={search?.limit || 20} onLoadLess={(displayLimit)=> {

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
    JSON.stringify(prevProps.search) === JSON.stringify(nextProps.search) &&
    JSON.stringify(prevProps.styles) === JSON.stringify(nextProps.styles) &&
    prevProps.listItem === nextProps.listItem &&
    JSON.stringify(prevProps.entityParams) === JSON.stringify(nextProps.entityParams) &&
    JSON.stringify(prevProps.searchNewData) === JSON.stringify(nextProps.searchNewData)
  );
}

export const ResourceListDisplay = React.memo(MemorizedComponent, arePropsEqual);


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
  const getResourceCache = useCacheStore((s)=> s.getResourceCache)

  const findCachedResource = getResourceCache(
    `${item.service}-${item.name}-${item.identifier}`,
    true
  );
  if (findCachedResource === null && !renderListItemLoader)
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
  if (findCachedResource === false && !renderListItemLoader)
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
    (findCachedResource === false || findCachedResource === null)
  ) {
    return renderListItemLoader(
      findCachedResource === null ? "LOADING" : "ERROR"
    );
  }

  // Example transformation (Modify item if needed)
  const transformedItem = findCachedResource
    ? findCachedResource
    : { qortalMetadata: item, data: null };

  return <>{render(transformedItem, index)}</>;
};
