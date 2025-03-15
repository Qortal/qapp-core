import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInView } from "react-intersection-observer";
import { QortalMetadata } from "../types/interfaces/resources";
import { useScrollTrackerRef } from "./useScrollTrackerRef";
import { useMergeRefs } from "../hooks/useMergeRefs";

interface PropsVirtualizedList {
  list: any[];
  children: (item: any, index: number) => React.ReactNode;
  onSeenLastItem?: (item: QortalMetadata)=> void;
  listName: string
}
export const VirtualizedList = ({ list, children, onSeenLastItem, listName }: PropsVirtualizedList) => {
  const parentRef = useRef(null);
useScrollTrackerRef(listName, parentRef)

  const rowVirtualizer = useVirtualizer({
    count: list.length,
    getItemKey: useCallback(
      (index: number) =>
        list[index]?.name && list[index]?.name
          ? `${list[index].name}-${list[index].identifier}`
          : list[index]?.id,
      [list]
    ),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Provide an estimated height of items, adjust this as needed
    overscan: 10, // Number of items to render outside the visible area to improve smoothness
  });

  const onSeenLastItemFunc = (lastItem: QortalMetadata) => {
    if(onSeenLastItem){
      onSeenLastItem(lastItem)
    }
    
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <div
          ref={parentRef}
          className="List"
          style={{
            flexGrow: 1,
            overflow: "auto",
            position: "relative",
            display: "flex",
            height: "0px",
          }}
        >
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const index = virtualRow.index;
                const item = list[index];
                return (
                  <div
                    data-index={virtualRow.index} //needed for dynamic row height measurement
                    ref={rowVirtualizer.measureElement} //measure dynamic row height
                    key={`${item.name}-${item.identifier}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%", // Move to the center horizontally
                      transform: `translateY(${virtualRow.start}px) translateX(-50%)`, // Adjust for centering
                      width: "100%", // Control width (90% of the parent)
                      display: "flex",
                      alignItems: "center",
                      overscrollBehavior: "none",
                      flexDirection: "column",
                    }}
                  >
                    <MessageWrapper
                      isLast={index === list?.length - 1}
                      onSeen={() => onSeenLastItemFunc(item)}
                    >
                      {typeof children === "function"
                        ? children(item, index)
                        : null}
                    </MessageWrapper>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MessageWrapperProps {
  onSeen: () => void;
  isLast: boolean;
  children: ReactNode;
}

export const MessageWrapper: React.FC<MessageWrapperProps> = ({
  onSeen,
  isLast,
  children,
}) => {
  if (isLast) {
    return (
      <WatchComponent onSeen={onSeen} isLast={isLast}>
        {children}
      </WatchComponent>
    );
  }
  return <>{children}</>;
};

interface WatchComponentProps {
  onSeen: () => void;
  isLast: boolean;
  children: ReactNode;
}

const WatchComponent: React.FC<WatchComponentProps> = ({
  onSeen,
  isLast,
  children,
}) => {
  const { ref, inView } = useInView({
    threshold: 0.7,
    triggerOnce: true, // Ensure it only triggers once per mount
  });

  const hasBeenTriggered = useRef(false); // Prevent multiple triggers

  useEffect(() => {
    if (inView && isLast && onSeen && !hasBeenTriggered.current) {
      onSeen();
      hasBeenTriggered.current = true; // Mark as triggered
    }
  }, [inView, isLast, onSeen]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", display: "flex", justifyContent: "center" }}
    >
      {children}
    </div>
  );
};
