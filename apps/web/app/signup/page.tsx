"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Phone, Lock, ArrowRight, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
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

interface SponsorInfo {
  uid: string;
  name: string;
  mobile: string;
  role: "distributor";
}

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sponsorMobile, setSponsorMobile] = useState("");
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);
  const [sponsorStatus, setSponsorStatus] = useState<"idle" | "loading" | "ok" | "empty" | "error">("idle");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only resolve when full 10-digit distributor mobile is entered — auto-select, no list.
  useEffect(() => {
    const phone = sponsorMobile.replace(/\D/g, "").slice(0, 10);
    setSponsor(null);
    if (phone.length !== 10) {
      setSponsorStatus("idle");
      return;
    }

    let cancelled = false;
    setSponsorStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<ApiResponse<{ items: SponsorInfo[] }>>("/auth/sponsor/search", {
          params: { mobile: phone },
        });
        if (cancelled) return;
        if (!data.success) throw new Error(data.message);
        const match = (data.data.items ?? []).find((i) => i.mobile === phone) ?? data.data.items?.[0];
        if (!match) {
          setSponsorStatus("empty");
          return;
        }
        setSponsor(match);
        setSponsorStatus("ok");
      } catch {
        if (cancelled) return;
        setSponsorStatus("error");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sponsorMobile]);

  async function requestOtp(e?: FormEvent) {
    e?.preventDefault();
    if (!name || !mobile) return;
    if (!sponsor) {
      toast.error("Distributor ka sahi 10-digit mobile dalo");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<{ otp?: string; message: string }>>("/auth/signup/request", {
        name,
        mobile,
        sponsorUid: sponsor.uid,
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
    if (!otp || !sponsor) return;
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<SessionData>>("/auth/signup/verify", {
        name,
        mobile,
        otp,
        sponsorUid: sponsor.uid,
        portal: "agent",
        ...(password ? { password } : {}),
      });
      if (!data.success) throw new Error(data.message);
      setAuth(data.data.user, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
      toast.success(`Account created under ${sponsor.name} — complete KYC next`);
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
          Signup with OTP → KYC → set PIN. Apna mobile, phir Distributor mobile.
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
            <div>
              <Field label="Distributor mobile no." icon={Phone}>
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={sponsorMobile}
                  onChange={(e) => setSponsorMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="10-digit distributor mobile"
                  autoComplete="off"
                />
              </Field>
              {sponsorStatus === "loading" ? (
                <p className="mt-1.5 text-xs" style={{ color: B.muted }}>
                  Checking distributor…
                </p>
              ) : null}
              {sponsorStatus === "ok" && sponsor ? (
                <div
                  className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                  style={{ background: `${B.green}14`, color: B.greenDark ?? B.green }}
                >
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>
                    {sponsor.name}
                    <span className="ml-1 font-normal opacity-80">· Distributor</span>
                  </span>
                </div>
              ) : null}
              {sponsorStatus === "empty" ? (
                <div
                  className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                  style={{ background: "#DC262614", color: "#B91C1C" }}
                >
                  <AlertCircle size={14} className="shrink-0" />
                  Is number pe koi active Distributor nahi mila
                </div>
              ) : null}
              {sponsorStatus === "error" ? (
                <div
                  className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                  style={{ background: "#DC262614", color: "#B91C1C" }}
                >
                  <AlertCircle size={14} className="shrink-0" />
                  Lookup failed — dubara try karo
                </div>
              ) : null}
            </div>
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
              disabled={loading || !sponsor}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: B.badgeGrad }}
            >
              {loading ? "Sending…" : "Send OTP"} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            {sponsor ? (
              <div
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ background: `${B.green}14`, color: B.greenDark ?? B.green }}
              >
                Mapping under {sponsor.name} ({sponsor.mobile})
              </div>
            ) : null}
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
