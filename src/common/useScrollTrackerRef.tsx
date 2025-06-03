import { useEffect, useRef, useState } from "react";

export const useScrollTrackerRef = (listName: string, hasList: boolean, scrollerRef: React.RefObject<HTMLElement | null> | undefined) => {
  const [hasMounted, setHasMounted] = useState(false)
  const hasScrollRef = useRef(false)
  useEffect(() => {
    if (!listName || !scrollerRef?.current || !hasMounted) return;

    const SCROLL_KEY = `scroll-position-${listName}`;
    const handleScroll = () => {
        if(!scrollerRef.current) return
      sessionStorage.setItem(SCROLL_KEY, scrollerRef.current.scrollTop.toString());
    };

    scrollerRef.current.addEventListener("scroll", handleScroll);

    return () => {
      if (scrollerRef.current) {
        scrollerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [listName,  hasMounted]);

  useEffect(() => {
    if (!listName || !hasList || hasScrollRef.current || !scrollerRef?.current) return;
    const SCROLL_KEY = `scroll-position-${listName}`;
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);
  
    const attemptScrollRestore = () => {
      const el = scrollerRef.current;
        const saved = parseInt(savedPosition || '0', 10);
        if (!el) return;
        if (el.scrollHeight > el.clientHeight && saved <= el.scrollHeight - el.clientHeight) {
      
            setTimeout(() => {
                el.scrollTop = saved;
            }, 200);
            setHasMounted(true)
            hasScrollRef.current = true;
        } else {
          requestAnimationFrame(attemptScrollRestore);
        }
      
     
    };

    requestAnimationFrame(attemptScrollRestore);
  }, [listName, hasList]);
};
