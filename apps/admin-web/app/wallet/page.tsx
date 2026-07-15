"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { UserPlus, Wallet } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { DownlineTable } from "@/components/dashboard/DownlineTable";
import { OnboardForm } from "@/components/dashboard/OnboardForm";
import { FundForm } from "@/components/dashboard/FundForm";
import { FundSelfForm } from "@/components/dashboard/FundSelfForm";
import { fetchApi } from "@/lib/api";
import { B, ROLE_LABEL } from "@/lib/brand";
import { CHILD_ROLE } from "@/lib/roles";
import { useAuthStore } from "@/lib/store";
import type { DownlineUser, WalletBalance } from "@/lib/types";
import { useAuthHydrated } from "@/lib/useAuthHydrated";

export default function WalletPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [downline, setDownline] = useState<DownlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showFundSelf, setShowFundSelf] = useState(false);
  const [fundTarget, setFundTarget] = useState<DownlineUser | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [walletData, downlineData] = await Promise.all([
        fetchApi<WalletBalance[]>("/wallet/me"),
        fetchApi<DownlineUser[]>("/users/downline"),
      ]);
      setWallets(walletData);
      setDownline(downlineData);
    } catch {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void loadData();
  }, [hydrated, accessToken, router, loadData]);

  if (!hydrated || !accessToken || !user) return null;

  const childRole = CHILD_ROLE[user.role];
  const main = wallets.find((w) => w.walletType === "main") ?? wallets[0];

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: B.blue }}>
              Wallet & Fund
            </h1>
            <p className="mt-1 text-sm" style={{ color: B.muted }}>
              Fund yourself, onboard Super Distributors, transfer to downline
            </p>
          </div>
          <div
            className="rounded-2xl border bg-white px-5 py-3"
            style={{ borderColor: B.border }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: B.muted }}>
              Main balance
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: B.blue }}>
              ₹{main ? Number(main.balance).toLocaleString("en-IN") : "0"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFundSelf(true)}
            className="flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold"
            style={{ borderColor: B.blue, color: B.blue }}
          >
            <Wallet size={16} />
            Fund my wallet
          </button>
          {childRole && (
            <button
              type="button"
              onClick={() => setShowOnboard(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
              style={{ background: B.badgeGrad }}
            >
              <UserPlus size={16} />
              Onboard {ROLE_LABEL[childRole] ?? childRole}
            </button>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: B.muted }}>
            My downline {childRole ? `(${ROLE_LABEL[childRole] ?? childRole}s)` : ""}
          </h2>
          {loading ? (
            <p className="text-sm" style={{ color: B.muted }}>
              Loading…
            </p>
          ) : (
            <DownlineTable users={downline} onFund={setFundTarget} />
          )}
        </div>
      </div>

      {showOnboard && childRole && (
        <OnboardForm
          childRole={childRole}
          childRoleLabel={ROLE_LABEL[childRole] ?? childRole}
          onClose={() => setShowOnboard(false)}
          onSuccess={() => void loadData()}
        />
      )}
      {showFundSelf && (
        <FundSelfForm onClose={() => setShowFundSelf(false)} onSuccess={() => void loadData()} />
      )}
      {fundTarget && (
        <FundForm target={fundTarget} onClose={() => setFundTarget(null)} onSuccess={() => void loadData()} />
      )}
    </AdminShell>
  );
}
