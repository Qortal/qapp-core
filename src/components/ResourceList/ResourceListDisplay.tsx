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


interface PropsResourceListDisplay {
  params: QortalSearchParams;
  listItem: (item: ListItem, index: number) => React.ReactNode; // Function type
}

export const ResourceListDisplay = ({
  params,
  listItem,
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
      noResultsMessage="No results available"
      resultsLength={list?.length}
      isLoading={isLoading}
      loadingMessage="Retrieving list. Please wait."
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexGrow: isLoading ? 0 : 1 }}>
          <VirtualizedList list={list}>
            {(item: QortalMetadata, index: number) => (
              <ListItemWrapper item={item} index={index} render={listItem} />
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
}

const ListItemWrapper: React.FC<ListItemWrapperProps> = ({
  item,
  index,
  render,
}) => {
  console.log("Rendering wrapped item:", item, index);
  const getResourceCache = useCacheStore().getResourceCache;

  const findCachedResource = getResourceCache(
    `${item.service}-${item.name}-${item.identifier}`,
    true
  );
    if (findCachedResource === null)
      return (
        <ItemCardWrapper height={60} isInCart={false}>
          <ResourceLoader
            message="Fetching Data..."
            status="loading"
          />
        </ItemCardWrapper>
      );
    if (findCachedResource === false)
      return (
        <ItemCardWrapper height={60} isInCart={false}>
          <ResourceLoader
            message="Product is unavailble at this moment... Try again later."
            status="error"
          />
        </ItemCardWrapper>
      );

  // Example transformation (Modify item if needed)
  const transformedItem = findCachedResource
    ? findCachedResource
    : { qortalMetadata: item };

  return <>{render(transformedItem, index)}</>;
};
