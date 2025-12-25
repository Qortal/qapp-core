import { create } from 'zustand';

// ✅ Define the Auth State Type
interface AuthState {
  /** Qortal address of the visiting user*/
  address: string | null;
  /** Qortal public key of the visiting user*/
  publicKey: string | null;
  /** Qortal name of the visiting user if they have one*/
  name: string | null;
  primaryName: string | null;
  /** Qortal avatar url. Only exists if the user has a Qortal name. Even though the url exists they might not have an avatar yet.*/
  avatarUrl: string | null;
  /** The user's QORT balance*/
  balance: number | null;
  isLoadingUser: boolean;
  isLoadingInitialBalance: boolean;
  errorLoadingUser: string | null;

  // Methods
  setUser: (user: {
    address: string;
    publicKey: string;
    name?: string;
  }) => void;
  setBalance: (balance: number) => void;
  setPrimaryName: (primaryName: string) => void;
  setIsLoadingUser: (loading: boolean) => void;
  setIsLoadingBalance: (loading: boolean) => void;
  setErrorLoadingUser: (error: string | null) => void;
  setName: (name: string | null) => void;
}

// ✅ Typed Zustand Store
export const useAuthStore = create<AuthState>((set) => ({
  address: null,
  publicKey: null,
  name: null,
  avatarUrl: null,
  balance: null,
  isLoadingUser: false,
  isLoadingInitialBalance: false,
  errorLoadingUser: null,
  primaryName: null,

  // Methods
  setUser: (user) =>
    set({
      address: user.address,
      publicKey: user.publicKey,
      name: user.name || null,
      avatarUrl: !user?.name
        ? null
        : `/arbitrary/THUMBNAIL/${encodeURIComponent(user.name)}/qortal_avatar?async=true`,
    }),
  setBalance: (balance) => set({ balance }),
  setPrimaryName: (primaryName) => set({ primaryName }),
  setIsLoadingUser: (loading) => set({ isLoadingUser: loading }),
  setIsLoadingBalance: (loading) => set({ isLoadingInitialBalance: loading }),
  setErrorLoadingUser: (error) => set({ errorLoadingUser: error }),
  setName: (name) =>
    set({
      name,
      avatarUrl: !name
        ? null
        : `/arbitrary/THUMBNAIL/${encodeURIComponent(name)}/qortal_avatar?async=true`,
    }),
}));
