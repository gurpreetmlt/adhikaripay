"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Phone, Lock, ArrowRight, UserPlus } from "lucide-react";
import type { ApiResponse, AuthUser } from "@adhikaripay/shared-types";
import { AdhikariPayLogo } from "@/components/brand/Logo";
import api from "@/lib/api";
import { B } from "@/lib/brand";
import { useAuthStore } from "@/lib/store";
import { extractApiError, nextOnboardingPath } from "@/lib/onboarding";

interface SessionData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sponsorUid, setSponsorUid] = useState("DSB6EBF70D7992");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e?: FormEvent) {
    e?.preventDefault();
    if (!name || !mobile || !sponsorUid) return;
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<{ otp?: string; message: string }>>("/auth/signup/request", {
        name,
        mobile,
        sponsorUid: sponsorUid.trim().toUpperCase(),
        portal: "agent",
      });
      if (!data.success) throw new Error(data.message);
      setDevOtp(data.data.otp ?? null);
      setStep("otp");
      toast.success(data.data.otp ? `Dev OTP: ${data.data.otp}` : "OTP sent");
    } catch (err) {
      toast.error(extractApiError(err, "Signup OTP failed"));
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<SessionData>>("/auth/signup/verify", {
        name,
        mobile,
        otp,
        sponsorUid: sponsorUid.trim().toUpperCase(),
        portal: "agent",
        ...(password ? { password } : {}),
      });
      if (!data.success) throw new Error(data.message);
      setAuth(data.data.user, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
      toast.success("Account created — complete KYC next");
      router.replace(nextOnboardingPath(data.data.user) ?? "/kyc?onboarding=1");
    } catch (err) {
      toast.error(extractApiError(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: B.bg }}>
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl" style={{ borderColor: B.border }}>
        <AdhikariPayLogo width={200} />
        <h1 className="mt-6 text-2xl font-bold" style={{ color: B.blue }}>
          Create agent account
        </h1>
        <p className="mt-1 text-sm" style={{ color: B.muted }}>
          Signup with OTP → KYC → set PIN. Need your Distributor UID.
        </p>

        {step === "form" ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <Field label="Full name" icon={UserPlus}>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Your name"
              />
            </Field>
            <Field label="Mobile" icon={Phone}>
              <input
                required
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="10-digit mobile"
              />
            </Field>
            <Field label="Distributor UID (sponsor)" icon={Lock}>
              <input
                required
                value={sponsorUid}
                onChange={(e) => setSponsorUid(e.target.value.toUpperCase())}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="DS…"
              />
            </Field>
            <Field label="Login password (optional)" icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Min 8 chars, letter + number"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: B.badgeGrad }}
            >
              {loading ? "Sending…" : "Send OTP"} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            {devOtp && (
              <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: `${B.green}18`, color: B.greenDark }}>
                Dev OTP: {devOtp}
              </div>
            )}
            <Field label="6-digit OTP" icon={Lock}>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-transparent text-sm outline-none tracking-widest"
                placeholder="••••••"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: B.walletGrad }}
            >
              {loading ? "Creating…" : "Verify & continue"} <ArrowRight size={16} />
            </button>
            <button type="button" className="w-full text-sm font-medium" style={{ color: B.muted }} onClick={() => setStep("form")}>
              Edit details
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: B.muted }}>
          Already registered?{" "}
          <Link href="/login" className="font-semibold" style={{ color: B.blue }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: B.muted }}>
        {label}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 px-4 py-3" style={{ borderColor: B.border }}>
        <Icon size={16} style={{ color: B.muted }} />
        {children}
      </div>
    </div>
  );
}
