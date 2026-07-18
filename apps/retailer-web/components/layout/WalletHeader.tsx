"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, RefreshCw, LogOut, ChevronDown, ArrowLeftRight, CreditCard, Settings, Crown } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import type { WalletBalance } from "@/lib/types";

interface WalletHeaderProps {
  wallets: WalletBalance[];
  onRefresh: () => void;
  refreshing: boolean;
}

function comingSoon(label: string) {
  toast(`${label} — coming soon`, { icon: "🚧" });
}

export function WalletHeader({ wallets, onRefresh, refreshing }: WalletHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [visible, setVisible] = useState(true);

  const mainWallet = wallets.find((w) => w.walletType === "main");

  async function handleLogout() {
    // Must hit the BFF route — the session cookies are httpOnly, so client JS (the store) can't
    // clear them itself. Without this, the UI would show "logged out" while the cookie still
    // authenticates every /api/proxy request.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    logout();
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div>
          <button
            onClick={() => comingSoon("Switch wallet")}
            className="flex items-center gap-1 text-xl font-bold text-gray-900"
          >
            {visible ? `₹${mainWallet ? Number(mainWallet.balance).toLocaleString("en-IN") : "0"}` : "••••••"}
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          <p className="text-xs text-gray-500">Wallet Balance</p>
        </div>

        <button onClick={() => setVisible((v) => !v)} className="text-gray-400 hover:text-gray-600" aria-label="Toggle balance visibility">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          onClick={onRefresh}
          className="text-gray-400 hover:text-brand-600 disabled:opacity-50"
          disabled={refreshing}
          aria-label="Refresh balance"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => comingSoon("Switch account")}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Switch account"
        >
          <ArrowLeftRight size={16} />
        </button>

        {wallets
          .filter((w) => w.walletType !== "main")
          .map((w) => (
            <div key={w.walletType} className="ml-3 border-l border-border-subtle pl-6">
              <p className="text-xs uppercase text-gray-500">{w.walletType}</p>
              <span className="text-sm font-semibold text-gray-700">
                {visible ? `₹${Number(w.balance).toLocaleString("en-IN")}` : "••••••"}
              </span>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => comingSoon("ZET Credit Card")}
          className="flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
        >
          <CreditCard size={14} />
          ZET Credit Card
          <span className="text-brand-400">›</span>
        </button>

        <button
          onClick={() => comingSoon("VIP membership")}
          className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-amber-950"
        >
          <Crown size={13} />
          BECOME VIP
        </button>

        <button
          onClick={() => comingSoon("Settings")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-gray-500 hover:bg-surface"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>

        <div className="ml-1 text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.uid}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-gray-600 hover:bg-surface"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
}
