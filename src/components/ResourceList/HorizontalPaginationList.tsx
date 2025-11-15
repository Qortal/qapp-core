import React, { useMemo, useRef, useState } from "react";
import DynamicGrid from "./DynamicGrid";
import LazyLoad from "../../common/LazyLoad";
import { ListItem } from "../../state/cache";
import { QortalMetadata } from "../../types/interfaces/resources";
import { DefaultLoaderParams, ListItemWrapper } from "./ResourceListDisplay";

interface HorizontalPaginatedListProps {
  items: QortalMetadata[];
  listItem: (item: ListItem, index: number) => React.ReactNode;
  loaderItem?: (status: "LOADING" | "ERROR") => React.ReactNode;
  onLoadMore: (limit: number) => void;
  onLoadLess: (limit: number) => void;
  minItemWidth?: number;
  gap?: number;
  limit: number;
  disablePagination?: boolean;
  defaultLoaderParams?: DefaultLoaderParams;
}

const MemorizedComponent = ({
  items,
  listItem,
  loaderItem,
  onLoadMore,
  onLoadLess,
  minItemWidth,
  gap,
  limit,
  disablePagination,
  defaultLoaderParams,
}: HorizontalPaginatedListProps) => {
  const lastItemRef = useRef<any>(null);
  const lastItemRef2 = useRef<any>(null);
  const [columnsPerRow, setColumnsPerRow] = useState<null | number>(null);

  const displayedLimit = useMemo(() => {
    if (disablePagination) return limit || 20;
    return (
      Math.floor((limit || 20) / (columnsPerRow || 3)) * (columnsPerRow || 3)
    );
  }, [columnsPerRow, disablePagination]);

  const displayedItems = disablePagination
    ? items
    : items?.length < displayedLimit * 3
      ? items?.slice(0, displayedLimit * 3)
      : items.slice(-(displayedLimit * 3));

  return (
    <div
      style={{
        overflowX: "hidden",
        width: "100%",
        display: "flex",
        flexGrow: 1,
        flexDirection: "column",
      }}
    >
      {!disablePagination && items?.length > displayedLimit * 3 && (
        <LazyLoad
          onLoadMore={async () => {
            await onLoadLess(displayedLimit);
            lastItemRef2.current.scrollIntoView({
              behavior: "auto",
              block: "start",
            });
            setTimeout(() => {
              window.scrollBy({ top: -50, behavior: "instant" }); // 'smooth' if needed
            }, 0);
          }}
        />
      )}
      <DynamicGrid
        setColumnsPerRow={setColumnsPerRow}
        minItemWidth={minItemWidth}
        gap={gap}
        items={displayedItems?.map((item, index, list) => (
          <React.Fragment
            key={`${item?.name}-${item?.service}-${item?.identifier}`}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
              ref={
                index === displayedLimit
                  ? lastItemRef2
                  : index ===
                      (list.length - displayedLimit - 1 < displayedLimit
                        ? displayedLimit - 1
                        : list.length - displayedLimit - 1)
                    ? lastItemRef
                    : null
              }
            >
              <ListItemWrapper
                defaultLoaderParams={defaultLoaderParams}
                item={item}
                index={index}
                render={listItem}
                renderListItemLoader={loaderItem}
              />
            </div>
          </React.Fragment>
        ))}
      >
        {(disablePagination ||
          (!disablePagination && displayedItems?.length >= limit)) && (
          <LazyLoad
            onLoadMore={async () => {
              await onLoadMore(displayedLimit);
              if (
                !disablePagination &&
                displayedItems?.length === displayedLimit * 3
              ) {
                lastItemRef.current.scrollIntoView({
                  behavior: "auto",
                  block: "end",
                });
                setTimeout(() => {
                  window.scrollBy({ top: 50, behavior: "instant" }); // 'smooth' if needed
                }, 0);
              }
            }}
          />
        )}
      </DynamicGrid>
    </div>
  );
};

export const HorizontalPaginatedList = React.memo(MemorizedComponent);
