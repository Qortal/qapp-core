import React, { CSSProperties, useCallback, useRef } from 'react'
import { useVirtualizer } from "@tanstack/react-virtual";

interface PropsVirtualizedList {
  list: any[]
  children: (item: any, index: number) => React.ReactNode;
}
export const VirtualizedList = ({list, children}: PropsVirtualizedList) => {
      const parentRef = useRef(null);
    
      const rowVirtualizer = useVirtualizer({
        count: list.length,
        getItemKey: useCallback((index: number) => (list[index]?.name && list[index]?.name) ?`${list[index].name}-${list[index].identifier}`: list[index]?.id, [list]),
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80, // Provide an estimated height of items, adjust this as needed
        overscan: 10, // Number of items to render outside the visible area to improve smoothness
      });

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
                    flexDirection: "column"
                  }}
                >
               {typeof children === "function" ? children(item, index) : null}

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
