import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  QortalMetadata,
  QortalSearchParams,
} from "../../types/interfaces/resources";
import { useResources } from "../../hooks/useResources";
import { MessageWrapper, VirtualizedList } from "../../common/VirtualizedList";
import { ListLoader } from "../../common/ListLoader";
import { ListItem, useCacheStore } from "../../state/cache";
import { ResourceLoader } from "./ResourceLoader";
import { ItemCardWrapper } from "./ItemCardWrapper";
import { Spacer } from "../../common/Spacer";
import DynamicGrid from "./DynamicGrid";
import LazyLoad from "../../common/LazyLoad";
import { useListStore } from "../../state/lists";
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

interface DefaultLoaderParams {
  listLoadingText?: string;
  listNoResultsText?: string;
  listItemLoadingText?: string;
  listItemErrorText?: string;
}

interface BaseProps {
  params: QortalSearchParams;
  listItem: (item: ListItem, index: number) => React.ReactNode;
  styles?: ResourceListStyles;
  loaderItem?: (status: "LOADING" | "ERROR") => React.ReactNode;
  defaultLoaderParams?: DefaultLoaderParams;
  loaderList?: (status: "LOADING" | "NO_RESULTS") => React.ReactNode;
  disableVirtualization?: boolean;
  onSeenLastItem?: (listItem: QortalMetadata) => void;
  listName: string
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

export const ResourceListDisplay = ({
  params,
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
  listName
}: PropsResourceListDisplay) => {
  const { fetchResources } = useResources();
  const {  getTemporaryResources } = useCacheStore();
  const [isLoading, setIsLoading] = useState(false);
  const memoizedParams = useMemo(() => JSON.stringify(params), [params]);
  const addList = useListStore().addList
  const addItems = useListStore().addItems
  const list = useListStore().getListByName(listName)
  const listToDisplay = useMemo(()=> {
    return [...getTemporaryResources(listName), ...list]
  }, [list, listName])

  const getResourceList = useCallback(async () => {
    try {
      setIsLoading(true);
      const parsedParams = JSON.parse(memoizedParams);
      const res = await fetchResources(parsedParams, listName, true); // Awaiting the async function
      addList(listName, res || [])
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedParams, fetchResources]); // Added dependencies for re-fetching

  const getResourceMoreList = useCallback(async () => {
    try {
      // setIsLoading(true);
      const parsedParams = {...(JSON.parse(memoizedParams))};
      parsedParams.before = list.length === 0 ? null : list[list.length - 1]?.created
      parsedParams.offset = null
      const res = await fetchResources(parsedParams, listName); // Awaiting the async function
      addItems(listName, res || [])
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedParams, listName, list]); 

  useEffect(() => {
    getResourceList();
  }, [getResourceList]); // Runs when dependencies change

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

  return (
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
            <VirtualizedList list={listToDisplay} onSeenLastItem={(item)=> {
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
                    render={listItem}
                    renderListItemLoader={loaderItem}
                  />
                  {styles?.gap && <Spacer height={`${styles.gap / 2}px`} />}
                </>
              )}
            </VirtualizedList>
          )}
          {disableVirtualization && direction === "HORIZONTAL" && (
            <>
            <DynamicGrid
              minItemWidth={styles?.horizontalStyles?.minItemWidth}
              gap={styles?.gap}
              items={listToDisplay?.map((item, index) => {
                return (
                  <React.Fragment
                    key={`${item?.name}-${item?.service}-${item?.identifier}`}
                  >
                    <ListItemWrapper
                      defaultLoaderParams={defaultLoaderParams}
                      item={item}
                      index={index}
                      render={listItem}
                      renderListItemLoader={loaderItem}
                    />
                  </React.Fragment>
                );
              })}
            >

            {!isLoading && listToDisplay?.length > 0 && (
                <LazyLoad onLoadMore={()=> {
                  getResourceMoreList()
                  if(onSeenLastItem){
                
                    onSeenLastItem(listToDisplay[listToDisplay?.length - 1])
                  }
                }} />
              )}
              </DynamicGrid>
            </>
            
          )}
          {disableVirtualization && direction === "VERTICAL" && (
            <div style={disabledVirutalizationStyles}>
              {listToDisplay?.map((item, index) => {
                return (
                  <React.Fragment
                    key={`${item?.name}-${item?.service}-${item?.identifier}`}
                  >
                   
                      <ListItemWrapper
                        defaultLoaderParams={defaultLoaderParams}
                        item={item}
                        index={index}
                        render={listItem}
                        renderListItemLoader={loaderItem}
                      />
            
                  </React.Fragment>
                );
              })}
              {!isLoading && listToDisplay?.length > 0 && (
                <LazyLoad onLoadMore={()=> {
                  getResourceMoreList()
                  if(onSeenLastItem){                    
                    onSeenLastItem(listToDisplay[listToDisplay?.length - 1])
                  }
                }} />
              )}
              
            </div>
          )}
        </div>
      </div>
    </ListLoader>
  );
};

interface ListItemWrapperProps {
  item: QortalMetadata;
  index: number;
  render: (item: ListItem, index: number) => React.ReactNode;
  defaultLoaderParams?: DefaultLoaderParams;
  renderListItemLoader?: (status: "LOADING" | "ERROR") => React.ReactNode;
}

const ListItemWrapper: React.FC<ListItemWrapperProps> = ({
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
