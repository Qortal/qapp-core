import { useEffect, useRef } from "react";

export function useMergeRefs<T extends HTMLElement>(
  ...refs: (React.Ref<T> | undefined)[]
) {
  const mergedRef = useRef<T>(null as unknown as T); // ✅ Ensures correct type

  useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(mergedRef.current);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<T>).current = mergedRef.current;
      }
    });
  }, [refs]);

  return mergedRef;
}
