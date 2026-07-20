"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  TrendingUp,
  Wallet,
  UserPlus,
  ArrowRightLeft,
  BarChart3,
  Store,
  Clock,
  IndianRupee,
  CalendarDays,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchApi } from "@/lib/api";
import { B, roleFromUserRole, initials } from "@/lib/brand";
import { useAuthStore } from "@/lib/store";
import { formatInr } from "@/lib/walletLabels";
import type { WalletBalance } from "@/lib/types";

interface ActivityMonth {
  month: string;
  monthLabel: string;
  total: number;
  transacted: number;
  noActivity: number;
}

interface DistributorStats {
  role: "distributor";
  retailers: { total: number; active: number; inactive: number };
  today: { volume: string; commission: string };
  topRetailers: { id: string; name: string; volume: string }[];
  activityHistory?: ActivityMonth[];
}

export function DistributorDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = roleFromUserRole(user?.role);

  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [stats, setStats] = useState<DistributorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [walletRows, dashStats] = await Promise.all([
          fetchApi<WalletBalance[]>("/wallet/me"),
          fetchApi<DistributorStats>("/dashboard/stats"),
        ]);
        if (!alive) return;
        setWallets(walletRows);
        setStats(dashStats);
        const hist = dashStats.activityHistory ?? [];
        if (hist.length > 0) {
          setSelectedMonth(hist[hist.length - 1]!.month);
        }
      } catch {
        if (alive) toast.error("Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const primary = wallets.find((w) => w.walletType === "main");
  const totalPending = wallets.reduce(
    (s, w) => s + (parseFloat(w.pendingBalance ?? "0") || 0),
    0,
  );
  const history = stats?.activityHistory ?? [];
  const selected =
    history.find((h) => h.month === selectedMonth) ?? history[history.length - 1] ?? null;

  return (
    <div className="space-y-5">
      {/* Top Row: Wallet + Retailer Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white lg:col-span-1"
          style={{ background: role.gradient, boxShadow: `0 8px 32px ${role.color}40` }}
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white opacity-10" />
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
            <Wallet size={14} /> Main Balance
          </div>
          <div className="mb-1 text-3xl font-bold">
            {loading ? "…" : formatInr(primary?.balance ?? "0")}
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-white/15 pt-3">
            <span className="flex items-center gap-1 text-xs text-white/70">
              <Clock size={12} /> Pending: {formatInr(totalPending)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 lg:col-span-2" style={{ borderColor: B.border }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Store size={18} style={{ color: B.blue }} />
              <h3 className="truncate font-bold" style={{ color: B.blue }}>
                Retailer Activity
                {selected ? (
                  <span className="font-semibold" style={{ color: B.muted }}>
                    {" "}
                    · {selected.monthLabel}
                  </span>
                ) : null}
              </h3>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                title="Select month"
                aria-label="Select month"
                onClick={() => setMonthPickerOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border transition hover:bg-slate-50"
                style={{ borderColor: B.border, color: B.blue }}
              >
                <CalendarDays size={18} />
              </button>
              {monthPickerOpen && history.length > 0 ? (
                <div
                  className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border bg-white shadow-lg"
                  style={{ borderColor: B.border }}
                >
                  {history.map((m) => {
                    const active = m.month === (selected?.month ?? selectedMonth);
                    return (
                      <button
                        key={m.month}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.month);
                          setMonthPickerOpen(false);
                        }}
                        className="flex w-full px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50"
                        style={{
                          color: active ? B.blue : B.muted,
                          background: active ? `${B.blue}10` : undefined,
                        }}
                      >
                        {m.monthLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {history.length > 0 ? (
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
              {history.map((m) => {
                const active = m.month === (selected?.month ?? selectedMonth);
                return (
                  <button
                    key={`tab-${m.month}`}
                    type="button"
                    onClick={() => setSelectedMonth(m.month)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: active ? B.blue : B.secondary,
                      color: active ? "#fff" : B.muted,
                    }}
                  >
                    {m.monthLabel.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl p-3 text-center sm:p-4" style={{ background: B.secondary }}>
              <div className="text-2xl font-bold" style={{ color: B.blue }}>
                {loading ? "…" : (selected?.total ?? stats?.retailers.total ?? 0)}
              </div>
              <div className="mt-1 text-xs font-medium" style={{ color: B.muted }}>
                Total Retailers
              </div>
            </div>
            <div className="rounded-xl p-3 text-center sm:p-4" style={{ background: `${B.green}10` }}>
              <div className="text-2xl font-bold" style={{ color: B.green }}>
                {loading ? "…" : (selected?.transacted ?? stats?.retailers.active ?? 0)}
              </div>
              <div className="mt-1 text-xs font-medium" style={{ color: B.muted }}>
                Transacted
              </div>
            </div>
            <div className="rounded-xl p-3 text-center sm:p-4" style={{ background: "#FEF2F2" }}>
              <div className="text-2xl font-bold" style={{ color: "#DC2626" }}>
                {loading ? "…" : (selected?.noActivity ?? stats?.retailers.inactive ?? 0)}
              </div>
              <div className="mt-1 text-xs font-medium" style={{ color: B.muted }}>
                No Activity
              </div>
            </div>
          </div>

          <div
            className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2"
            style={{ borderColor: B.border }}
          >
            <div className="rounded-xl px-4 py-3" style={{ background: B.secondary }}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: B.muted }}>
                <BarChart3 size={13} style={{ color: B.blue }} />
                Today&apos;s Volume
              </div>
              <div className="text-xl font-bold" style={{ color: B.blue }}>
                {loading ? "…" : formatInr(stats?.today.volume ?? "0")}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: B.green }}>
                <TrendingUp size={11} /> All retailers
              </div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: `${B.green}10` }}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: B.muted }}>
                <IndianRupee size={13} style={{ color: B.green }} />
                Commission Today
              </div>
              <div className="text-xl font-bold" style={{ color: B.green }}>
                {loading ? "…" : formatInr(stats?.today.commission ?? "0")}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: B.muted }}>
                Your share
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — above the fold */}
      <div className="rounded-2xl border bg-white p-5" style={{ borderColor: B.border }}>
        <h3 className="mb-4 text-sm font-bold" style={{ color: B.blue }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            icon={<UserPlus size={18} />}
            label="Add Retailer"
            desc="Onboard a new retailer"
            onClick={() => router.push("/signup")}
          />
          <QuickAction
            icon={<ArrowRightLeft size={18} />}
            label="Fund / Reverse"
            desc="Send or reverse retailer balance"
            onClick={() => router.push("/wallet")}
          />
          <QuickAction
            icon={<BarChart3 size={18} />}
            label="View Reports"
            desc="Transaction & commission reports"
            onClick={() => router.push("/reports")}
          />
        </div>
      </div>

      {/* Monthly Activity History */}
      <div className="rounded-2xl border bg-white p-5" style={{ borderColor: B.border }}>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={16} style={{ color: B.blue }} />
          <h3 className="text-sm font-bold" style={{ color: B.blue }}>
            Monthly Activity History
          </h3>
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm" style={{ color: B.muted }}>
            Loading…
          </p>
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: B.muted }}>
            No history yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: B.border }}>
                  {["Month", "Total Retailers", "Transacted", "No Activity"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: B.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.month} className="border-b" style={{ borderColor: B.border }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: B.blue }}>
                      {row.monthLabel}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: B.blue }}>
                      {row.total}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums" style={{ color: B.green }}>
                      {row.transacted}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums" style={{ color: "#DC2626" }}>
                      {row.noActivity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Performing Retailers + Fund Requests */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: B.border }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: B.blue }} />
              <h3 className="text-sm font-bold" style={{ color: B.blue }}>
                Top Retailers (Today)
              </h3>
            </div>
          </div>
          {!stats || stats.topRetailers.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Users size={28} className="mb-2 opacity-30" style={{ color: B.muted }} />
              <p className="text-xs" style={{ color: B.muted }}>
                No activity yet today
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topRetailers.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: B.secondary }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: i === 0 ? B.green : B.blue }}
                    >
                      {initials(r.name)}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: B.blue }}>
                      {r.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: B.green }}>
                    {formatInr(r.volume)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: B.border }}>
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft size={16} style={{ color: B.blue }} />
            <h3 className="text-sm font-bold" style={{ color: B.blue }}>
              Fund Requests
            </h3>
          </div>
          <div className="flex flex-col items-center py-8">
            <Clock size={28} className="mb-2 opacity-30" style={{ color: B.muted }} />
            <p className="text-xs" style={{ color: B.muted }}>
              No pending fund requests
            </p>
            <p className="mt-1 text-xs" style={{ color: B.muted }}>
              Retailer requests will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md"
      style={{ borderColor: B.border }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: B.secondary, color: B.blue }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: B.blue }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: B.muted }}>
          {desc}
        </div>
      </div>
    </button>
  );
}
