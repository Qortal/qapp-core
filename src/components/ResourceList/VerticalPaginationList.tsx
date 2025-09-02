import React, { useRef } from 'react';
import LazyLoad from '../../common/LazyLoad';
import { ListItem } from '../../state/cache';
import { QortalMetadata } from '../../types/interfaces/resources';
import { DefaultLoaderParams, ListItemWrapper } from './ResourceListDisplay';

interface VerticalPaginatedListProps {
  items: QortalMetadata[];
  listItem: (item: ListItem, index: number) => React.ReactNode;
  loaderItem?: (status: 'LOADING' | 'ERROR') => React.ReactNode;
  onLoadMore: (limit: number) => void;
  onLoadLess: (limit: number) => void;
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
  limit,
  disablePagination,
  defaultLoaderParams,
}: VerticalPaginatedListProps) => {
  const lastItemRef = useRef<any>(null);
  const lastItemRef2 = useRef<any>(null);

  const displayedLimit = limit || 20;

  const displayedItems = disablePagination
    ? items
    : items?.length < displayedLimit * 3
      ? items?.slice(0, displayedLimit * 3)
      : items.slice(-(displayedLimit * 3));

  return (
    <>
      {!disablePagination && items?.length > displayedLimit * 3 && (
        <LazyLoad
          onLoadMore={async () => {
            await onLoadLess(displayedLimit);
            lastItemRef2.current.scrollIntoView({
              behavior: 'auto',
              block: 'start',
            });
            setTimeout(() => {
              window.scrollBy({ top: -50, behavior: 'instant' }); // 'smooth' if needed
            }, 0);
          }}
        />
      )}

      {displayedItems?.map((item, index, list) => {
        return (
          <React.Fragment
            key={`${item?.name}-${item?.service}-${item?.identifier}`}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
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
        );
      })}
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
                behavior: 'auto',
                block: 'end',
              });
              setTimeout(() => {
                window.scrollBy({ top: 50, behavior: 'instant' }); // 'smooth' if needed
              }, 0);
            }
          }}
        />
      )}
    </>
  );
};

export const VerticalPaginatedList = React.memo(MemorizedComponent);
