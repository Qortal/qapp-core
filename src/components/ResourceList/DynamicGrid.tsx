import React, { useEffect, useRef, useState, ReactNode } from "react";

interface DynamicGridProps {
  items: ReactNode[]; // ✅ Accepts an array of JSX components
  itemWidth?: number; // Minimum width per item
  gap?: number; // Spacing between grid items
  children: ReactNode
  minItemWidth?: number
}

const DynamicGrid: React.FC<DynamicGridProps> = ({
  items,
  minItemWidth = 200, // Minimum width per item
  gap = 10, // Space between items
  children,
}) => {

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div
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
          <div key={index} style={{ width: "100%", display: "flex", justifyContent: "center", maxWidth: '400px' }}>
            {component} {/* ✅ Renders user-provided component */}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
};




export default DynamicGrid;
