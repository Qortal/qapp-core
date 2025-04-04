import React, { useCallback } from "react";
import { OpenIndex, useIndexStore } from "../state/indexes";

export const useIndexes = () => {
  const setOpen = useIndexStore((state) => state.setOpen);
  const openPageIndexManager = useCallback(
    ({ link, name, category, rootName }: OpenIndex) => {
        if(!link || !name || !category) return
      setOpen({
        name,
        link,
        category,
        rootName
      });
    },
    [setOpen]
  );

  return {
    openPageIndexManager,
  };
};
