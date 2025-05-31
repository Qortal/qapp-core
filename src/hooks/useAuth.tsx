import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "../state/auth";

// ✅ Define Types
/**
 * Configuration for balance retrieval behavior.
 */
export type BalanceSetting =
  | {
      /** If `true`, the balance will be fetched only once when the app loads. */
      onlyOnMount: true;
      /** `interval` cannot be set when `onlyOnMount` is `true`. */
      interval?: never;
    }
  | {
      /** If `false` or omitted, balance will be updated periodically. */
      onlyOnMount?: false;
      /** The time interval (in milliseconds) for balance updates. */
      interval?: number;
    };

interface userAccountInfo {
  address: string;
  publicKey: string
}
export interface UseAuthProps {
  balanceSetting?: BalanceSetting;
  /** User will be prompted for authentication on start-up */
  authenticateOnMount?: boolean;
  userAccountInfo?: userAccountInfo | null
}

export const useAuth = ({ balanceSetting, authenticateOnMount = true, userAccountInfo = null }: UseAuthProps) => {
  const address = useAuthStore((s) => s.address);
const publicKey = useAuthStore((s) => s.publicKey);
const name = useAuthStore((s) => s.name);
const avatarUrl = useAuthStore((s) => s.avatarUrl);
const balance = useAuthStore((s) => s.balance);

const isLoadingUser = useAuthStore((s) => s.isLoadingUser);
const isLoadingInitialBalance = useAuthStore((s) => s.isLoadingInitialBalance);
const errorLoadingUser = useAuthStore((s) => s.errorLoadingUser);

const setErrorLoadingUser = useAuthStore((s) => s.setErrorLoadingUser);
const setIsLoadingUser = useAuthStore((s) => s.setIsLoadingUser);
const setUser = useAuthStore((s) => s.setUser);
const setBalance = useAuthStore((s) => s.setBalance);


  const balanceSetIntervalRef = useRef<null | ReturnType<typeof setInterval>>(null);

  const authenticateUser = useCallback(async (userAccountInfo?: userAccountInfo) => {
    try {
      setErrorLoadingUser(null);
      setIsLoadingUser(true);

      const account = userAccountInfo || await qortalRequest({
        action: "GET_USER_ACCOUNT",
      });

      if (account?.address) {
        const nameData = await qortalRequest({
          action: "GET_PRIMARY_NAME",
          address: account.address,
        });
        setUser({ ...account, name: nameData || "" });
      }
    } catch (error) {
      setErrorLoadingUser(
        error instanceof Error ? error.message : "Unable to authenticate"
      );
    } finally {
      setIsLoadingUser(false);
    }
  }, [setErrorLoadingUser, setIsLoadingUser, setUser]);

  const getBalance = useCallback(async (address: string): Promise<number> => {
    try {
      const response = await qortalRequest({
        action: "GET_BALANCE",
        address,
      });
      const userBalance = Number(response) || 0
      setBalance(userBalance);
      return userBalance
    } catch (error) {
      setBalance(0);
      return 0
    }
  }, [setBalance]);

  const balanceSetInterval = useCallback((address: string, interval: number) => {
    try {
      if (balanceSetIntervalRef.current) {
        clearInterval(balanceSetIntervalRef.current);
      }

      let isCalling = false;
      balanceSetIntervalRef.current = setInterval(async () => {
        if (isCalling) return;
        isCalling = true;
        await getBalance(address);
        isCalling = false;
      }, interval);
    } catch (error) {
      console.error(error);
    }
  }, [getBalance]);

  useEffect(() => {
    if (authenticateOnMount) {
      authenticateUser();
    }
    if(userAccountInfo?.address && userAccountInfo?.publicKey){
      authenticateUser(userAccountInfo);
    }
  }, [authenticateOnMount, authenticateUser, userAccountInfo?.address, userAccountInfo?.publicKey]);

  useEffect(() => {
    if (address && (balanceSetting?.onlyOnMount || (balanceSetting?.interval && !isNaN(balanceSetting?.interval)))) {
      getBalance(address);
    }
    if (address && balanceSetting?.interval !== undefined && !isNaN(balanceSetting.interval)) {
      balanceSetInterval(address, balanceSetting.interval);
    }
  }, [balanceSetting?.onlyOnMount, balanceSetting?.interval, address, getBalance, balanceSetInterval]);

  const manualGetBalance = useCallback(async () : Promise<number | Error> =>  {
    if(!address) throw new Error('Not authenticated')
    const res = await getBalance(address)
    return res
  }, [address])

  return useMemo(() => ({
    address,
    publicKey,
    name,
    avatarUrl,
    balance,
    isLoadingUser,
    isLoadingInitialBalance,
    errorMessageLoadingUser: errorLoadingUser,
    authenticateUser,
    getBalance: manualGetBalance,
  }), [
    address,
    publicKey,
    name,
    avatarUrl,
    balance,
    isLoadingUser,
    isLoadingInitialBalance,
    errorLoadingUser,
    authenticateUser,
    manualGetBalance,
  ]);
};
