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
import { VirtualizedList } from "../../common/VirtualizedList";
import { ListLoader } from "../../common/ListLoader";
import { ListItem, useCacheStore } from "../../state/cache";
import { ResourceLoader } from "./ResourceLoader";
import { ItemCardWrapper } from "./ItemCardWrapper";
import { Spacer } from "../../common/Spacer";



interface ResourceListStyles {
  gap?: number
  listLoadingHeight?: CSSProperties
}

interface DefaultLoaderParams {
 listLoadingText?: string
 listNoResultsText?: string
 listItemLoadingText?: string
 listItemErrorText?: string
}

interface PropsResourceListDisplay {
  params: QortalSearchParams;
  listItem: (item: ListItem, index: number) => React.ReactNode; // Function type
  styles?: ResourceListStyles
  loaderItem?: (status: "LOADING" | "ERROR") => React.ReactNode; // Function type
  defaultLoaderParams?: DefaultLoaderParams
  loaderList?: (status: "LOADING" | "NO_RESULTS") => React.ReactNode; // Function type
}




export const ResourceListDisplay = ({
  params,
  listItem,
  styles = {
    gap: 1
  },
  defaultLoaderParams,
  loaderItem,
  loaderList
}: PropsResourceListDisplay) => {
  const [list, setList] = useState<QortalMetadata[]>([]);
  const { fetchResources } = useResources();
  const [isLoading, setIsLoading] = useState(false);
  const memoizedParams = useMemo(() => JSON.stringify(params), [params]);

  const getResourceList = useCallback(async () => {
    try {
      setIsLoading(true);
      const parsedParams = JSON.parse(memoizedParams);
      const res = await fetchResources(parsedParams); // Awaiting the async function
      setList(res || []); // Ensure it's an array, avoid setting `undefined`
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedParams, fetchResources]); // Added dependencies for re-fetching

  useEffect(() => {
    getResourceList();
  }, [getResourceList]); // Runs when dependencies change

  return (
    <ListLoader
      noResultsMessage={defaultLoaderParams?.listNoResultsText || "No results available"}
      resultsLength={list?.length}
      isLoading={isLoading}
      loadingMessage={defaultLoaderParams?.listLoadingText || "Retrieving list. Please wait."}
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
          <VirtualizedList list={list}>
            {(item: QortalMetadata, index: number) => (
              <>
              {styles?.gap && <Spacer height={`${styles.gap / 2}rem`} /> }
              <Spacer/>
              <ListItemWrapper defaultLoaderParams={defaultLoaderParams} item={item} index={index} render={listItem} renderListItemLoader={loaderItem} />
              {styles?.gap && <Spacer height={`${styles.gap / 2}rem`} /> }
              </>
            )}
          </VirtualizedList>
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
  renderListItemLoader?:(status: "LOADING" | "ERROR")=> React.ReactNode;
}

const ListItemWrapper: React.FC<ListItemWrapperProps> = ({
  item,
  index,
  render,
  defaultLoaderParams,
  renderListItemLoader
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
            message={defaultLoaderParams?.listItemLoadingText || "Fetching Data..."}
            status="loading"
          />
        </ItemCardWrapper>
      );
    if (findCachedResource === false && !renderListItemLoader)
      return (
        <ItemCardWrapper height={60} isInCart={false}>
          <ResourceLoader
            message={defaultLoaderParams?.listItemErrorText ||"Resource is unavailble at this moment... Try again later."}
            status="error"
          />
        </ItemCardWrapper>
      );
      if(renderListItemLoader && (findCachedResource === false || findCachedResource === null)){
        return renderListItemLoader(findCachedResource === null ? "LOADING" : "ERROR")
      }

  // Example transformation (Modify item if needed)
  const transformedItem = findCachedResource
    ? findCachedResource
    : { qortalMetadata: item };

  return <>{render(transformedItem, index)}</>;
};
