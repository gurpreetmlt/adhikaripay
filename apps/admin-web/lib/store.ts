import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthUser } from "@adhikaripay/shared-types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

/** sessionStorage — clears when the tab closes; prefer httpOnly cookies (BFF) for production. */
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("adhikaripay-admin-auth");
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (user, tokens) => set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "adhikaripay-admin-auth",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
