import React, { useEffect, useState, useCallback } from "react";
import DynamicGrid from "./DynamicGrid";
import LazyLoad from "../../common/LazyLoad";
import { ListItem, useCacheStore } from "../../state/cache";
import { QortalMetadata } from "../../types/interfaces/resources";
import { ListItemWrapper } from "./ResourceListDisplay";

interface HorizontalPaginatedListProps {
  items: QortalMetadata[];
  listItem: (item: ListItem, index: number) => React.ReactNode;
  loaderItem?: (status: "LOADING" | "ERROR") => React.ReactNode;
  onLoadMore: () => void;
  maxItems?: number;
  minItemWidth?: number;
  gap?: number;
  isLoading?: boolean;
  onSeenLastItem?: (listItem: ListItem) => void;

}

export const HorizontalPaginatedList = ({
  items,
  listItem,
  loaderItem,
  onLoadMore,
  maxItems = 60,
  minItemWidth,
  gap,
  isLoading,
  onSeenLastItem,

}: HorizontalPaginatedListProps) => {
  const [displayedItems, setDisplayedItems] = useState(items);
 

  useEffect(() => {
    setDisplayedItems(items);
  }, [items]);

  const preserveScroll = useCallback((updateFunction: () => void) => {
    const previousScrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    const previousScrollWidth = document.documentElement.scrollWidth || document.body.scrollWidth;

    updateFunction(); // Perform the update (fetch new data, remove old)

    requestAnimationFrame(() => {
      const newScrollWidth = document.documentElement.scrollWidth || document.body.scrollWidth;
      document.documentElement.scrollLeft = document.body.scrollLeft =
        previousScrollLeft - (previousScrollWidth - newScrollWidth);
    });
  }, []);

  useEffect(() => {
    if (displayedItems.length > maxItems) {
      preserveScroll(() => {
        const excess = displayedItems.length - maxItems;
        setDisplayedItems((prev) => prev.slice(excess)); // Trim from the start
      });
    }
  }, [displayedItems, maxItems, preserveScroll]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
      const clientWidth = document.documentElement.clientWidth || document.body.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth || document.body.scrollWidth;

      if (scrollLeft + clientWidth >= scrollWidth - 10 && !isLoading) {
        onLoadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, isLoading]);

  return (
    <div style={{ overflow: "auto", width: "100%", display: "flex", flexGrow: 1 }}>
      <DynamicGrid
        minItemWidth={minItemWidth}
        gap={gap}
        items={displayedItems.map((item, index) => (
          <React.Fragment key={`${item?.name}-${item?.service}-${item?.identifier}`}>
            <ListItemWrapper
              item={item}
              index={index}
              render={listItem}
              renderListItemLoader={loaderItem}
            />
          </React.Fragment>
        ))}
      >
        {!isLoading && displayedItems.length > 0 && (
          <LazyLoad
            onLoadMore={() => {
              onLoadMore();
              if (onSeenLastItem) {
                // onSeenLastItem(displayedItems[displayedItems.length - 1]);
              }
            }}
          />
        )}
      </DynamicGrid>
    </div>
  );
};
