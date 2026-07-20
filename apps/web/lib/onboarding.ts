import type { AuthUser } from "@adhikaripay/shared-types";

/**
 * Post-auth funnel:
 * - Retailer self-signup: KYC → PIN
 * - Anyone without txn PIN: set PIN (used by OTP+PIN login)
 */
export function nextOnboardingPath(user: AuthUser | null | undefined): string | null {
  if (!user) return "/login";

  if (user.role === "retailer" && user.hasKycDocs !== true && user.kycStatus !== "verified") {
    return "/kyc?onboarding=1";
  }
  if (user.hasTxnPin !== true) {
    return "/onboarding/pin";
  }
  return null;
}

export function extractApiError(err: unknown, fallback: string): string {
  const status = (err as { response?: { status?: number } }).response?.status;
  if (status === 429) return "Too many requests — wait a moment and retry";
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[] | undefined> } } })
    .response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return first;
  }
  return data?.message ?? fallback;
}
