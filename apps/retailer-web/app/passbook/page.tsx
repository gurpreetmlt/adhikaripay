"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useAuthHydrated } from "@/lib/useAuthHydrated";
import { Sidebar } from "@/components/layout/Sidebar";

interface LedgerEntry {
  id: string;
  walletType: string;
  entryType: "debit" | "credit";
  amount: string;
  balanceAfter: string;
  referenceType: string;
  description: string | null;
  createdAt: string;
}

export default function PassbookPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    fetchApi<LedgerEntry[]>("/wallet/ledger", { limit: 50 })
      .then(setEntries)
      .catch(() => toast.error("Failed to load passbook"))
      .finally(() => setLoading(false));
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <header className="border-b border-border-subtle bg-card px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Passbook</h1>
        </header>

        <main className="mx-auto max-w-3xl space-y-2 p-6">
          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-gray-500">No transactions yet.</p>}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    entry.entryType === "credit" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600",
                  )}
                >
                  {entry.entryType === "credit" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {entry.description || entry.referenceType.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleString("en-IN")} · {entry.walletType} wallet
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={clsx("text-sm font-semibold", entry.entryType === "credit" ? "text-green-600" : "text-red-600")}>
                  {entry.entryType === "credit" ? "+" : "-"}₹{Number(entry.amount).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-400">Bal: ₹{Number(entry.balanceAfter).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
