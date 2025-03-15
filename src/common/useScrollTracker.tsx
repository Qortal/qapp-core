import { useEffect, useRef } from "react";

export const useScrollTracker = (listName: string) => {
  useEffect(() => {
    if (!listName) return;

    const SCROLL_KEY = `scroll-position-${listName}`;

    // 🔹 Restore saved scroll position for the given list
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }

    const handleScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, window.scrollY.toString());
    };

    // 🔹 Save scroll position on scroll
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [listName]); // ✅ Only runs when listName changes
};