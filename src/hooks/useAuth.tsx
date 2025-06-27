import { useCallback, useMemo } from "react";
import { useAuthStore } from "../state/auth";
import { userAccountInfo } from "./useInitializeAuth";

export const useAuth = () => {
  const address = useAuthStore((s) => s.address);
  const publicKey = useAuthStore((s) => s.publicKey);
  const name = useAuthStore((s) => s.name);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);

  const isLoadingUser = useAuthStore((s) => s.isLoadingUser);
  const errorLoadingUser = useAuthStore((s) => s.errorLoadingUser);
  const setErrorLoadingUser = useAuthStore((s) => s.setErrorLoadingUser);
  const setIsLoadingUser = useAuthStore((s) => s.setIsLoadingUser);
  const setUser = useAuthStore((s) => s.setUser);
  const setName = useAuthStore((s) => s.setName);
  const authenticateUser = useCallback(
    async (userAccountInfo?: userAccountInfo) => {
      try {
        setErrorLoadingUser(null);
        setIsLoadingUser(true);

        const account =
          userAccountInfo ||
          (await qortalRequest({
            action: "GET_USER_ACCOUNT",
          }));

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
    },
    [setErrorLoadingUser, setIsLoadingUser, setUser]
  );

  const switchName = useCallback(
    async (name: string) => {
      if (!name) throw new Error("No name provided");
      const response = await fetch(`/names/${name}`);
      if (!response?.ok) throw new Error("Error fetching name details");
      const nameInfo = await response.json();
      const currentAddress = useAuthStore.getState().address;

      if (nameInfo?.owner !== currentAddress)
        throw new Error(`This account does not own the name ${name}`);
      setName(name);
    },
    [setName]
  );
  return useMemo(
    () => ({
      address,
      publicKey,
      name,
      avatarUrl,
      isLoadingUser,
      errorMessageLoadingUser: errorLoadingUser,
      authenticateUser,
      switchName,
    }),
    [
      address,
      publicKey,
      name,
      avatarUrl,
      isLoadingUser,
      errorLoadingUser,
      authenticateUser,
      switchName,
    ]
  );
};
