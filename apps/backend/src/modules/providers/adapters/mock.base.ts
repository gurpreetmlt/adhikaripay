import { randomUUID } from "node:crypto";
import type {
  AepsBank,
  AepsBankListParams,
  AepsParams,
  AepsTxnOtpParams,
  AgentAuthParams,
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
  // Marks every subclass as a stub so the router can refuse to settle money on it in production.
  readonly isStub = true;

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

  aepsDeposit(params: AepsParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("AEPS cash deposit", params.amount, {});
  }

  aepsTransactionOtp(
    params: AepsTxnOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    // Mock OTP dispatch — dummy flow accepts any 6-digit OTP typed at capture time.
    return this.respond("AEPS transaction OTP", undefined, {
      referenceKey: `MOCKOTP-${randomUUID().slice(0, 16)}`,
      validity: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
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

  aepsBankList(_params: AepsBankListParams): Promise<ProviderResult<{ banks: AepsBank[] }>> {
    // Real NPCI IINs so dummy-mode selection matches live behaviour; extend as needed.
    const banks: AepsBank[] = [
      { bankId: 109005, name: "STATE BANK OF INDIA", iin: "607094", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "33", aadhaarpayFailureRate: "45" },
      { bankId: 74984, name: "Punjab National Bank", iin: "607027", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "16", aadhaarpayFailureRate: "71" },
      { bankId: 39287, name: "BANK OF BARODA", iin: "606985", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "32", aadhaarpayFailureRate: "78" },
      { bankId: 11263, name: "HDFC Bank", iin: "607152", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "27", aadhaarpayFailureRate: "100" },
      { bankId: 15910, name: "ICICI Bank", iin: "508534", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "58", aadhaarpayFailureRate: "100" },
      { bankId: 1, name: "AIRTEL PAYMENTS BANK", iin: "990320", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "18", aadhaarpayFailureRate: "50" },
      { bankId: 96035, name: "UCO BANK", iin: "607066", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "22", aadhaarpayFailureRate: "100" },
      { bankId: 47267, name: "BANK OF INDIA", iin: "508505", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "33", aadhaarpayFailureRate: "50" },
      { bankId: 53201, name: "CANARA BANK", iin: "607396", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "24", aadhaarpayFailureRate: "0" },
      { bankId: 20500, name: "INDIAN BANK", iin: "607105", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "30", aadhaarpayFailureRate: "67" },
      { bankId: 91606, name: "UNION BANK OF INDIA", iin: "607161", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "32", aadhaarpayFailureRate: "0" },
      { bankId: 106167, name: "PUNJAB AND SIND BANK", iin: "607087", aepsEnabled: true, aadhaarpayEnabled: true, aepsFailureRate: "26", aadhaarpayFailureRate: "100" },
    ];
    return this.respond("AEPS bank list", undefined, { banks });
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

  agentAuth(params: AgentAuthParams): Promise<ProviderResult<Record<string, never>>> {
    return this.respond("Agent authentication", undefined, {});
  }
}
