import { useEffect, useRef, useState } from "react";

export const useScrollTracker = (listName: string, hasList: boolean, disableScrollTracker?: boolean) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [hasMount, setHasMount] = useState(false);
  const scrollPositionRef = useRef(0); // Store the last known scroll position

  useEffect(() => {
    if(disableScrollTracker) return
    if (!listName || !hasList) return;
    
    const SCROLL_KEY = `scroll-position-${listName}`;

    // 🔹 Restore scroll when the component mounts
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
      setTimeout(() => {
        setHasMount(true);
      }, 200);
    }

    // 🔹 Capture scroll position before unmount
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY; // Store the last known scroll position
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      sessionStorage.setItem(SCROLL_KEY, scrollPositionRef.current.toString());
      window.removeEventListener("scroll", handleScroll);
    };
  }, [listName, hasList, disableScrollTracker]);

  return { elementRef, hasMount };
};
