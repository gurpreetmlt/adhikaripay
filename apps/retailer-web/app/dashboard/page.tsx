"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useAuthHydrated } from "@/lib/useAuthHydrated";
import type { CatalogCategoryView, WalletBalance } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { WalletHeader } from "@/components/layout/WalletHeader";
import { CategorySection } from "@/components/dashboard/CategorySection";
import { PromoBanner } from "@/components/dashboard/PromoBanner";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [categories, setCategories] = useState<CatalogCategoryView[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [catalogData, walletData] = await Promise.all([
        fetchApi<CatalogCategoryView[]>("/catalog"),
        fetchApi<WalletBalance[]>("/wallet/me"),
      ]);
      setCategories(catalogData);
      setWallets(walletData);
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

  if (!hydrated || !accessToken) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <WalletHeader wallets={wallets} onRefresh={() => void loadData(true)} refreshing={refreshing} />

        <main className="mx-auto flex max-w-6xl gap-4 p-6">
          <div className="flex-1 space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading services...</p>
            ) : (
              categories.map((category) => <CategorySection key={category.id} category={category} />)
            )}
          </div>
          <PromoBanner />
        </main>
      </div>
    </div>
  );
}
