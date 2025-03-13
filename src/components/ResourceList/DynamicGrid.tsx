import React, { useEffect, useRef, useState, ReactNode } from "react";

interface DynamicGridProps {
  items: ReactNode[]; // ✅ Accepts an array of JSX components
  itemWidth?: number; // Minimum width per item
  gap?: number; // Spacing between grid items
  children: ReactNode
}

const DynamicGrid: React.FC<DynamicGridProps> = ({
  items,
  itemWidth = 300, // Default min item width
  gap = 10, // Default gap between items
  children
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.offsetWidth;
        const newColumns = Math.floor(containerWidth / (itemWidth + gap));
        setColumns(newColumns > 0 ? newColumns : 1); // Ensure at least 1 column
      }
    };

    updateColumns(); // Initial column calculation

    const resizeObserver = new ResizeObserver(updateColumns);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => resizeObserver.disconnect(); // Cleanup observer
  }, [itemWidth, gap]);

  return (
    <div style={{ display: "flex", flexDirection: 'column', alignItems: "center", width: "100%" }}>
      {/* ✅ Centers the grid inside the parent */}
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(${itemWidth}px, 1fr))`, // ✅ Dynamically calculated columns
          gap: `${gap}px`,
          width: "100%", // ✅ Ensures grid fills available space
          maxWidth: "1200px", // ✅ Optional max width to prevent excessive stretching
          margin: "auto", // ✅ Centers the grid horizontally
          gridAutoFlow: "row", // ✅ Ensures rows behave correctly
        }}
      >
        {items.map((component, index) => (
          <div key={index} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {component} {/* ✅ Render user-provided component */}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
};

export default DynamicGrid;
