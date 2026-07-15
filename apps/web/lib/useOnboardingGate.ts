"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/store";
import { useAuthHydrated } from "@/lib/useAuthHydrated";
import { nextOnboardingPath } from "@/lib/onboarding";
import api from "@/lib/api";
import type { ApiResponse, AuthUser } from "@adhikaripay/shared-types";

const SKIP = new Set(["/login", "/signup"]);

/**
 * Refresh /auth/me and send new retailers through KYC → PIN.
 */
export function useOnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const fetching = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      if (!SKIP.has(pathname) && pathname !== "/") router.replace("/login");
      return;
    }

    if (fetching.current) return;
    fetching.current = true;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<ApiResponse<{ user: AuthUser }>>("/auth/me");
        if (cancelled || !data.success) return;
        setUser(data.data.user);
        const next = nextOnboardingPath(data.data.user);
        const onKyc = pathname.startsWith("/kyc");
        const onPin = pathname.startsWith("/onboarding/pin");
        if (next === "/kyc?onboarding=1" && !onKyc) {
          toast.dismiss();
          router.replace(next);
        } else if (next === "/onboarding/pin" && !onPin && !onKyc) {
          toast.dismiss();
          router.replace(next);
        }
      } catch {
        const cached = useAuthStore.getState().user;
        const next = nextOnboardingPath(cached);
        if (next && !pathname.startsWith("/kyc") && !pathname.startsWith("/onboarding")) {
          toast.dismiss();
          router.replace(next);
        }
      } finally {
        fetching.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, accessToken, pathname, router, setUser]);
}
