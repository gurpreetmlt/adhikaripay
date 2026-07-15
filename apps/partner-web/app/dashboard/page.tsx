"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { UserPlus } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useAuthHydrated } from "@/lib/useAuthHydrated";
import { CHILD_ROLE, ROLE_LABEL } from "@/lib/roles";
import type { DownlineUser, WalletBalance } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { WalletHeader } from "@/components/layout/WalletHeader";
import { DownlineTable } from "@/components/dashboard/DownlineTable";
import { OnboardForm } from "@/components/dashboard/OnboardForm";
import { FundForm } from "@/components/dashboard/FundForm";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [downline, setDownline] = useState<DownlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [fundTarget, setFundTarget] = useState<DownlineUser | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [walletData, downlineData] = await Promise.all([
        fetchApi<WalletBalance[]>("/wallet/me"),
        fetchApi<DownlineUser[]>("/users/downline"),
      ]);
      setWallets(walletData);
      setDownline(downlineData);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <WalletHeader wallets={wallets} onRefresh={() => void loadData(true)} refreshing={refreshing} />

        <main className="mx-auto max-w-4xl space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              My Downline {childRole && `(${ROLE_LABEL[childRole]}s)`}
            </h2>
            {childRole && (
              <button
                onClick={() => setShowOnboard(true)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <UserPlus size={16} />
                Onboard {ROLE_LABEL[childRole]}
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <DownlineTable users={downline} onFund={setFundTarget} />
          )}
        </main>
      </div>

      {showOnboard && childRole && (
        <OnboardForm
          childRole={childRole}
          childRoleLabel={ROLE_LABEL[childRole]}
          onClose={() => setShowOnboard(false)}
          onSuccess={() => void loadData(true)}
        />
      )}

      {fundTarget && (
        <FundForm target={fundTarget} onClose={() => setFundTarget(null)} onSuccess={() => void loadData(true)} />
      )}
    </div>
  );
}
