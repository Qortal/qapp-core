import { useCallback, useMemo } from "react";
import { useAuthStore } from "../state/auth";

export const useQortBalance = () => {
  const address = useAuthStore((s) => s.address);
  const setBalance = useAuthStore((s) => s.setBalance);
  const isLoadingInitialBalance = useAuthStore(
    (s) => s.isLoadingInitialBalance,
  );
  const setIsLoadingBalance = useAuthStore((s) => s.setIsLoadingBalance);

  const qortBalance = useAuthStore((s) => s.balance);

  const getBalance = useCallback(
    async (address: string): Promise<number> => {
      try {
        setIsLoadingBalance(true);
        const response = await qortalRequest({
          action: "GET_BALANCE",
          address,
        });
        const userBalance = Number(response) || 0;
        setBalance(userBalance);
        return userBalance;
      } catch (error) {
        setBalance(0);
        return 0;
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [setBalance],
  );

  const manualGetBalance = useCallback(async (): Promise<number | Error> => {
    if (!address) throw new Error("Not authenticated");
    const res = await getBalance(address);
    return res;
  }, [address]);
  return useMemo(
    () => ({
      value: qortBalance,
      getBalance: manualGetBalance,
      isLoading: isLoadingInitialBalance,
    }),
    [qortBalance, manualGetBalance, isLoadingInitialBalance],
  );
};
