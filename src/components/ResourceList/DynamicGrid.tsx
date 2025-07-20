import React, { useEffect, useRef, useState, ReactNode } from "react";

interface DynamicGridProps {
  items: ReactNode[]; // ✅ Accepts an array of JSX components
  itemWidth?: number; // Minimum width per item
  gap?: number; // Spacing between grid items
  children: ReactNode
  minItemWidth?: number
  setColumnsPerRow: (columns: number)=> void;
}

const DynamicGrid: React.FC<DynamicGridProps> = ({
  items,
  minItemWidth = 200, // Minimum width per item
  gap = 10, // Space between items
  children,
  setColumnsPerRow

}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemContainerRef = useRef<HTMLDivElement | null>(null);

  const updateColumns = () => {
    if (containerRef.current && itemContainerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const itemWidth = itemContainerRef.current.clientWidth
      const calculatedColumns = Math.floor(containerWidth / itemWidth);
      setColumnsPerRow(calculatedColumns);
    }
  };

  useEffect(() => {
    updateColumns(); // Run on mount
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return (
    <div  style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div
              ref={containerRef}

        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`, // ✅ Expands to fit width
          gap: `${gap}px`,
          width: "100%",
          maxWidth: "100%", // ✅ Prevents overflow
          margin: "auto",
          overflow: "hidden", // ✅ Prevents horizontal scrollbars
          gridAutoFlow: "row dense", // ✅ Fills space efficiently
        }}
      >
        {items.map((component, index) => (
          <div ref={index === 0 ? itemContainerRef : null} key={index} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {component} {/* ✅ Renders user-provided component */}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
};




export default DynamicGrid;
