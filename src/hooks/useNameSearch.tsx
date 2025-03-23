import { useCallback, useEffect, useState } from "react";


interface NameListItem {
    name: string
    address: string
}
export const useNameSearch = (value: string, limit = 20) => {
  const [nameList, setNameList] = useState<NameListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const checkIfNameExisits = useCallback(
    async (name: string, listLimit: number) => {
      try {
        if(!name){
          setNameList([])
          return
        }
        setIsLoading(true);
        const res = await fetch(
          `/names/search?query=${name}&prefix=true&limit=${listLimit}`
        );
        const data = await res.json();
        setNameList(data?.map((item: any)=> {
            return {
                name: item.name,
                address: item.owner
            }
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      checkIfNameExisits(value, limit);
    }, 500);

    // Cleanup timeout if searchValue changes before the timeout completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);
  return {
    isLoading,
    results: nameList,
  };
};
