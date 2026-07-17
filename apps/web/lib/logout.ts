import axios from "axios";
import { useAuthStore } from "./store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Revoke all server sessions + clear local auth / biometric store. */
export async function logoutEverywhere(): Promise<void> {
  const { accessToken, refreshToken, logout } = useAuthStore.getState();
  try {
    await axios.post(
      `${API_BASE}/auth/logout`,
      { refreshToken: refreshToken ?? undefined },
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 8000 }
        : { timeout: 8000 },
    );
  } catch {
    /* still clear local */
  }
  logout();
}
