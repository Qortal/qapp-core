import { useEffect } from "react";

export const useScrollTrackerRef = (listName: string, ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!listName || !ref.current) return;

    const SCROLL_KEY = `scroll-position-${listName}`;
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);

 
        if (savedPosition && ref.current) {
            ref.current.scrollTop = parseInt(savedPosition, 10);
          }


    const handleScroll = () => {
      if (ref.current) {
        sessionStorage.setItem(SCROLL_KEY, ref.current.scrollTop.toString());
      }
    };

    ref.current.addEventListener("scroll", handleScroll);

    return () => {
      if (ref.current) {
        ref.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [listName, ref]);
};