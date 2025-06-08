import { useEffect, useRef, useState } from "react";
import { useCacheStore } from "../state/cache";

export const useScrollTracker = (listName: string, hasList: boolean, disableScrollTracker?: boolean) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [hasMount, setHasMount] = useState(false);
  const scrollPositionRef = useRef(0); // Store the last known scroll position

  useEffect(() => {
    if(disableScrollTracker) return
    if (!listName || !hasList) return;
    
    const SCROLL_KEY = `scroll-position-${listName}`;
        const isExpired = useCacheStore.getState().isListExpired(listName);
      if(isExpired === true) return
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
      if(!disableScrollTracker){
        sessionStorage.setItem(SCROLL_KEY, scrollPositionRef.current.toString());
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [listName, hasList, disableScrollTracker]);

  return { elementRef, hasMount };
};
