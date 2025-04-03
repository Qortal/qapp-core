import React, { useCallback } from "react";
import { OpenIndex, useIndexStore } from "../state/indexes";

export const useIndexes = () => {
  const setOpen = useIndexStore((state) => state.setOpen);
  const openPageIndexManager = useCallback(
    ({ link, name }: OpenIndex) => {
        if(!link || !name) return
      setOpen({
        name,
        link,
      });
    },
    [setOpen]
  );

  return {
    openPageIndexManager,
  };
};
