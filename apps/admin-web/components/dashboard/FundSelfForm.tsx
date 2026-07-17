"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

interface FundSelfFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Admin-only entry point for money entering the system from outside (bank reconciliation) —
// distinct from transferToChild, which only moves money that's already inside the ledger.
export function FundSelfForm({ onClose, onSuccess }: FundSelfFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txnPin, setTxnPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(txnPin)) {
      toast.error("Enter your 4-digit transaction PIN");
      return;
    }
    setLoading(true);
    try {
      const idempotencyKey = `admin-fund-${crypto.randomUUID()}`;
      await api.post("/wallet/fund", {
        amount,
        txnPin,
        idempotencyKey,
        ...(description ? { description } : {}),
      });
      toast.success(`₹${amount} added to your wallet`);
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Funding failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Fund My Wallet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount (₹)</label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="100000.00"
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Bank reconciliation ref"
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Transaction PIN</label>
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={txnPin}
            onChange={(e) => setTxnPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add Funds"}
        </button>
      </form>
    </Modal>
  );
}
