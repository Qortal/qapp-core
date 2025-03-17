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

export interface DefaultLoaderParams {
  listLoadingText?: string;
  listNoResultsText?: string;
  listItemLoadingText?: string;
  listItemErrorText?: string;
}

interface BaseProps  {
  search: QortalSearchParams;
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
  styles = {
    gap: 1,
  },
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
}: PropsResourceListDisplay)  => {
  const { fetchResources } = useResources();
  const {  filterOutDeletedResources } = useCacheStore();
  const deletedResources = useCacheStore().deletedResources
  const memoizedParams = useMemo(() => JSON.stringify(search), [search]);
  const addList = useListStore().addList
  const removeFromList =  useListStore().removeFromList
  const temporaryResources = useCacheStore().getTemporaryResources(listName)
  const addItems = useListStore().addItems
  const list = useListStore().getListByName(listName)
  const [isLoading, setIsLoading] = useState(list?.length > 0 ? false : true);

  const isListExpired = useCacheStore().isListExpired(listName)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const initialized = useRef(false)

  const getResourceList = useCallback(async () => {
    try {
      await new Promise((res)=> {
        setTimeout(() => {
          res(null)
        }, 500);
      })
      setIsLoading(true);
      const parsedParams = JSON.parse(memoizedParams);
      const responseData = await fetchResources(parsedParams, listName, true); // Awaiting the async function


     
        addList(listName,  responseData || []);
    
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedParams, fetchResources]); // Added dependencies for re-fetching

  useEffect(() => {
    if(initialized.current) return
    initialized.current = true
    if(!isListExpired) {
      setIsLoading(false)
      return
    }
    
    sessionStorage.removeItem(`scroll-position-${listName}`);
    getResourceList();
  }, [getResourceList, isListExpired]); // Runs when dependencies change

  const {elementRef} = useScrollTracker(listName, list?.length > 0, disableScrollTracker);

   const setSearchCacheExpiryDuration = useCacheStore().setSearchCacheExpiryDuration
  const setResourceCacheExpiryDuration = useCacheStore().setResourceCacheExpiryDuration
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
    return filterOutDeletedResources([...temporaryResources, ...list])
  }, [list, listName, deletedResources, temporaryResources])




  const getResourceMoreList = useCallback(async (displayLimit?: number) => {
    try {
      setIsLoadingMore(true)
      const parsedParams = {...(JSON.parse(memoizedParams))};
      parsedParams.before = list.length === 0 ? null : list[list.length - 1]?.created
      parsedParams.offset = null
      if(displayLimit){
        parsedParams.limit = displayLimit
      }
      const responseData = await fetchResources(parsedParams, listName); // Awaiting the async function
      addItems(listName, responseData || [])
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setTimeout(() => {
        setIsLoadingMore(false);

      }, 1000);
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
      height: '100%'
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
          height: "100%",
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
    prevProps.listItem === nextProps.listItem
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
  const getResourceCache = useCacheStore().getResourceCache;

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
    : { qortalMetadata: item };

  return <>{render(transformedItem, index)}</>;
};
