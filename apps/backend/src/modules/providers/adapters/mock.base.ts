import { randomUUID } from "node:crypto";
import type {
  AepsParams,
  BbpsFetchBillParams,
  BbpsPayBillParams,
  CheckStatusParams,
  DmtBeneficiaryParams,
  DmtTransferParams,
  ProviderAdapter,
  ProviderResult,
  RechargeParams,
} from "../types";

// Shared mock behaviour for stub adapters until real provider credentials arrive.
// Deterministic test hooks (amount decimals) let every failure path be exercised
// from the UI without touching code:
//   *.99  -> provider declines (failed)
//   *.98  -> provider times out (pending; resolve later via checkStatus)
//   anything else -> success
const MOCK_LATENCY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockOutcome(amount: string | undefined): "success" | "failed" | "pending" {
  if (!amount) return "success";
  if (amount.endsWith(".99")) return "failed";
  if (amount.endsWith(".98")) return "pending";
  return "success";
}

export abstract class MockAdapterBase implements ProviderAdapter {
  abstract readonly code: string;

  private async respond<TData extends Record<string, unknown>>(
    operation: string,
    amount: string | undefined,
    data: TData,
  ): Promise<ProviderResult<TData>> {
    await sleep(MOCK_LATENCY_MS);
    const outcome = mockOutcome(amount);
    const providerTxnId = outcome === "failed" ? null : `${this.code.toUpperCase()}-${randomUUID().slice(0, 12)}`;
    return {
      success: outcome === "success",
      status: outcome,
      providerTxnId,
      amount: amount ?? null,
      message:
        outcome === "success"
          ? `${operation} successful`
          : outcome === "pending"
            ? `${operation} pending at provider`
            : `${operation} declined by provider (mock)`,
      data,
      raw: { mock: true, provider: this.code, operation, outcome },
    };
  }

  aepsBalanceEnquiry(params: AepsParams): Promise<ProviderResult<{ balance: string }>> {
    return this.respond("AEPS balance enquiry", undefined, { balance: "12450.75" });
  }

  aepsWithdraw(params: AepsParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("AEPS cash withdrawal", params.amount, {});
  }

  aepsMiniStatement(
    params: AepsParams,
  ): Promise<ProviderResult<{ statement: { date: string; narration: string; amount: string; type: "credit" | "debit" }[] }>> {
    return this.respond("AEPS mini statement", undefined, {
      statement: [
        { date: "2026-07-10", narration: "UPI/CREDIT/9012", amount: "1500.00", type: "credit" },
        { date: "2026-07-09", narration: "ATM/WDL/4432", amount: "500.00", type: "debit" },
        { date: "2026-07-07", narration: "NEFT/SALARY", amount: "18000.00", type: "credit" },
      ],
    });
  }

  aadhaarPay(params: AepsParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("Aadhaar Pay", params.amount, {});
  }

  dmtAddBeneficiary(params: DmtBeneficiaryParams): Promise<ProviderResult<{ beneficiaryId: string }>> {
    return this.respond("DMT add beneficiary", undefined, { beneficiaryId: `BENE-${randomUUID().slice(0, 8)}` });
  }

  dmtTransfer(params: DmtTransferParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("DMT transfer", params.amount, {});
  }

  bbpsFetchBill(
    params: BbpsFetchBillParams,
  ): Promise<ProviderResult<{ billFetchRef: string; customerName: string; billAmount: string; dueDate: string }>> {
    return this.respond("BBPS bill fetch", undefined, {
      billFetchRef: `BILL-${randomUUID().slice(0, 8)}`,
      customerName: "MOCK CONSUMER",
      billAmount: "1240.00",
      dueDate: "2026-07-25",
    });
  }

  bbpsPayBill(params: BbpsPayBillParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("BBPS bill payment", params.amount, {});
  }

  recharge(params: RechargeParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("Recharge", params.amount, {});
  }

  checkStatus(params: CheckStatusParams): Promise<ProviderResult<Record<string, never>>> {
    // Mock: anything re-checked is confirmed successful, so pending flows can be
    // driven to completion from the UI.
    return this.respond("Status check", undefined, {});
  }
}
