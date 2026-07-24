"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Percent, Fingerprint, ChevronDown, ChevronRight } from "lucide-react";
import { DetailSection } from "@/components/users/DetailSection";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import api, { fetchApi } from "@/lib/api";
import { B } from "@/lib/brand";

type RuleType = "flat" | "percentage";

/**
 * Visual-only grouping (2026-07-21, user request): these Banking Services tiles are all AEPS
 * sub-operations — box them together with an "AEPS" label so it reads as one product, without
 * changing how rates are stored (still per-service under the hood — see Task 25 for the bigger
 * "one shared rate" decision, not done here).
 */
const AEPS_GROUP_CODES = new Set(["CASH_WITHDRAW", "MINI_STATEMENT", "CASH_DEPOSIT", "BALANCE_ENQUIRY"]);

interface CommissionServiceRow {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  hasOverride: boolean;
  ruleType: RuleType;
  value: string;
  rateActive: boolean;
}

interface CommissionCategory {
  id: string;
  code: string;
  name: string;
  services: CommissionServiceRow[];
}

interface CommissionPayload {
  user: { id: string; name: string; uid: string; role: string };
  categories: CommissionCategory[];
}

type Draft = {
  ruleType: RuleType;
  value: string;
  rateActive: boolean;
  dirty: boolean;
  clear: boolean;
};

export function AgentCommissionPanel({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<CommissionCategory[]>([]);
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>({});
  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyPayload = useCallback((data: CommissionPayload) => {
    setCategories(data.categories);
    const next: Record<string, Draft> = {};
    for (const cat of data.categories) {
      for (const s of cat.services) {
        next[s.id] = {
          ruleType: s.ruleType,
          value: s.value,
          rateActive: s.rateActive,
          dirty: false,
          clear: false,
        };
      }
    }
    setDrafts(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CommissionPayload>(`/admin/users/${userId}/commissions`);
      applyPayload(data);
    } catch {
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, [userId, applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDraft(serviceId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        ...patch,
        dirty: true,
        clear: patch.clear ?? false,
      },
    }));
  }

  /** Collapsed AEPS group: one control fans the same rate out to every sub-service's draft. */
  function patchGroupDraft(serviceIds: string[], patch: Partial<Draft>) {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const id of serviceIds) {
        next[id] = { ...next[id], ...patch, dirty: true, clear: patch.clear ?? false };
      }
      return next;
    });
  }

  async function saveAll() {
    const rates = Object.entries(drafts)
      .filter(([, d]) => d.dirty)
      .map(([serviceId, d]) => {
        if (d.clear || !d.value.trim()) {
          return { serviceId, ruleType: d.ruleType, value: "0", clear: true as const };
        }
        return {
          serviceId,
          ruleType: d.ruleType,
          value: d.value.trim(),
          isActive: d.rateActive,
          clear: false as const,
        };
      });

    if (rates.length === 0) {
      toast.error("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const data = await api.put(`/admin/users/${userId}/commissions`, { rates }).then((r) => {
        if (!r.data.success) throw new Error(r.data.message);
        return r.data.data as CommissionPayload;
      });
      applyPayload(data);
      toast.success("Commission rates saved");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Save failed",
      );
    } finally {
      setSaving(false);
    }
  }

  const dirtyCount = Object.values(drafts).filter((d) => d.dirty).length;

  return (
    <DetailSection title="Service Commission" icon={Percent}>
      <p className="mb-4 text-sm" style={{ color: B.muted }}>
        Set this agent’s cut per service (flat ₹ or %). Empty / Clear → role default use hoga.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: B.muted }}>
          Loading…
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const catCollapsed = !!categoryCollapsed[cat.id];
            return (
            <div key={cat.id} className="overflow-hidden rounded-xl border" style={{ borderColor: B.border }}>
              <button
                type="button"
                onClick={() => setCategoryCollapsed((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-black/[0.02]"
                style={{ background: B.secondary }}
              >
                <ChevronRight
                  size={14}
                  style={{ color: B.muted, transform: catCollapsed ? "none" : "rotate(90deg)", transition: "transform 0.15s ease" }}
                />
                <h3 className="text-sm font-semibold" style={{ color: B.blue }}>
                  {cat.name}
                </h3>
                <span className="font-mono text-[10px]" style={{ color: B.muted }}>
                  {cat.code}
                </span>
                <span className="ml-auto text-[11px]" style={{ color: B.muted }}>
                  {cat.services.length} services
                </span>
              </button>
              {!catCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr
                        className="border-b text-xs uppercase tracking-wider"
                        style={{
                          borderColor: B.border,
                          background: B.secondary,
                          color: B.muted,
                        }}
                      >
                        <th className="px-3 py-2.5 font-semibold">Service</th>
                        <th className="px-3 py-2.5 font-semibold">Type</th>
                        <th className="px-3 py-2.5 font-semibold">Value</th>
                        <th className="px-3 py-2.5 text-center font-semibold">On</th>
                        <th className="px-3 py-2.5 text-right font-semibold"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.services.map((s, idx) => {
                        const d =
                          drafts[s.id] ?? {
                            ruleType: s.ruleType,
                            value: s.value,
                            rateActive: s.rateActive,
                            dirty: false,
                            clear: false,
                          };
                        const inGroup = AEPS_GROUP_CODES.has(s.code);
                        const prevInGroup = idx > 0 && AEPS_GROUP_CODES.has(cat.services[idx - 1]!.code);
                        const nextInGroup = idx < cat.services.length - 1 && AEPS_GROUP_CODES.has(cat.services[idx + 1]!.code);
                        const isGroupStart = inGroup && !prevInGroup;
                        const collapsed = !!groupCollapsed[cat.id];
                        const isGroupEnd = inGroup && (!nextInGroup || collapsed);
                        if (inGroup && !isGroupStart && collapsed) return null;
                        const cellBg = inGroup ? `${B.blueLight}14` : undefined;
                        const cellBorderColor = inGroup ? B.blueLight : B.border;
                        // Collapsed AEPS: one shared control fans out to every sub-service. Expanded: each
                        // service keeps its own independent rate (normal per-row behaviour below).
                        const groupServiceIds = cat.services.filter((x) => AEPS_GROUP_CODES.has(x.code)).map((x) => x.id);
                        const asGroupControl = inGroup && isGroupStart && collapsed;
                        const onPatch = (patch: Partial<Draft>) =>
                          asGroupControl ? patchGroupDraft(groupServiceIds, patch) : patchDraft(s.id, patch);
                        return (
                          <Fragment key={s.id}>
                            {isGroupStart && (
                              <tr key={`${s.id}-group-label`}>
                                <td
                                  colSpan={5}
                                  className="px-3 pb-2 pt-3.5"
                                  style={{
                                    background: cellBg,
                                    boxShadow: `inset 2px 0 0 ${B.blueLight}, inset -2px 0 0 ${B.blueLight}, inset 0 2px 0 ${B.blueLight}`,
                                    borderTopLeftRadius: 12,
                                    borderTopRightRadius: 12,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setGroupCollapsed((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-95"
                                      style={{ background: B.blueLight }}
                                    >
                                      <Fingerprint size={12} />
                                      AEPS
                                      <ChevronDown
                                        size={12}
                                        style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s ease" }}
                                      />
                                    </button>
                                    {collapsed && (
                                      <span className="text-[11px] italic" style={{ color: B.muted }}>
                                        1 shared rate → 4 services
                                      </span>
                                    )}
                                    {!collapsed && (
                                      <span className="text-[11px]" style={{ color: B.muted }}>
                                        4 services, independent rates
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr
                              key={s.id}
                              className="transition-colors hover:bg-black/[0.02]"
                              style={{
                                borderBottom: inGroup ? "none" : `1px solid ${cellBorderColor}`,
                                ...(isGroupEnd ? { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 } : {}),
                              }}
                            >
                            <td
                              className="px-3 py-2.5"
                              style={{
                                background: cellBg,
                                ...(inGroup ? { borderLeft: `2px solid ${B.blueLight}` } : {}),
                                ...(isGroupEnd ? { borderBottom: `2px solid ${B.blueLight}`, borderBottomLeftRadius: 12, overflow: "hidden" } : {}),
                              }}
                            >
                              <div className="font-medium" style={{ color: B.blue }}>
                                {asGroupControl ? "All AEPS services" : s.name}
                              </div>
                              <div className="font-mono text-[10px]" style={{ color: B.muted }}>
                                {asGroupControl ? "same rate applies to all 4" : s.code}
                                {!asGroupControl && s.hasOverride && !d.clear ? " · custom" : ""}
                              </div>
                            </td>
                            <td className="px-3 py-2.5" style={{ background: cellBg, ...(isGroupEnd ? { borderBottom: `2px solid ${B.blueLight}` } : {}) }}>
                              <select
                                value={d.ruleType}
                                onChange={(e) =>
                                  onPatch({
                                    ruleType: e.target.value as RuleType,
                                    clear: false,
                                  })
                                }
                                className="rounded-lg border-2 bg-[var(--admin-bg)] px-2 py-1.5 text-sm outline-none"
                                style={{ borderColor: B.border, color: B.blue }}
                              >
                                <option value="percentage">%</option>
                                <option value="flat">Flat ₹</option>
                              </select>
                            </td>
                            <td className="px-3 py-2.5" style={{ background: cellBg, ...(isGroupEnd ? { borderBottom: `2px solid ${B.blueLight}` } : {}) }}>
                              <input
                                value={d.clear ? "" : d.value}
                                onChange={(e) =>
                                  onPatch({
                                    value: e.target.value,
                                    clear: false,
                                  })
                                }
                                placeholder={d.ruleType === "flat" ? "₹" : "%"}
                                inputMode="decimal"
                                className="w-24 rounded-lg border-2 bg-[var(--admin-bg)] px-2 py-1.5 text-sm outline-none"
                                style={{ borderColor: B.border, color: B.blue }}
                              />
                            </td>
                            <td className="px-3 py-2.5" style={{ background: cellBg, ...(isGroupEnd ? { borderBottom: `2px solid ${B.blueLight}` } : {}) }}>
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  checked={d.rateActive && !d.clear}
                                  onChange={(next) => onPatch({ rateActive: next, clear: false })}
                                  label={asGroupControl ? "All AEPS services commission" : `${s.name} commission`}
                                />
                              </div>
                            </td>
                            <td
                              className="px-3 py-2.5 text-right"
                              style={{
                                background: cellBg,
                                ...(inGroup ? { borderRight: `2px solid ${B.blueLight}` } : {}),
                                ...(isGroupEnd ? { borderBottom: `2px solid ${B.blueLight}`, borderBottomRightRadius: 12, overflow: "hidden" } : {}),
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => onPatch({ value: "", clear: true, rateActive: true })}
                                className="text-xs font-semibold hover:underline"
                                style={{ color: B.muted }}
                              >
                                Clear
                              </button>
                            </td>
                          </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {dirtyCount > 0 ? (
              <span className="text-xs" style={{ color: B.muted }}>
                {dirtyCount} change{dirtyCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <button
              type="button"
              disabled={saving || dirtyCount === 0}
              onClick={() => void saveAll()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: B.badgeGrad }}
            >
              {saving ? "Saving…" : "Save commissions"}
            </button>
          </div>
        </div>
      )}
    </DetailSection>
  );
}
