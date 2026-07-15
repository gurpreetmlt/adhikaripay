import { Types } from 'mongoose';
import {
  Role,
  UserStatus,
  KycStatus,
  Service,
  AggregatorProvider,
  TxnStatus,
  LedgerType,
  LedgerRefType,
  CommissionSlabType,
  KycProvider,
  TicketStatus,
  CURRENCY,
} from '@adhikaripay/config';

export interface IUser {
  role: Role;
  name: string;
  mobile: string;
  email?: string;
  passwordHash: string;
  txnPinHash?: string;
  parentId?: Types.ObjectId;
  status: UserStatus;
  kycStatus: KycStatus;
  walletId?: Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWallet {
  ownerId: Types.ObjectId;
  ownerRole: Role;
  balance: Types.Decimal128;
  holdBalance: Types.Decimal128;
  limit: number;
  currency: typeof CURRENCY;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletLedger {
  walletId: Types.ObjectId;
  type: LedgerType;
  amount: Types.Decimal128;
  balanceAfter: Types.Decimal128;
  reason: string;
  refType: LedgerRefType;
  refId?: Types.ObjectId;
  idempotencyKey: string;
  counterpartyWalletId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceTxn {
  retailerId: Types.ObjectId;
  service: Service;
  aggregator: AggregatorProvider;
  aggregatorTxnId?: string;
  status: TxnStatus;
  amount: Types.Decimal128;
  customerRef?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommissionSlab {
  min: number;
  max: number;
  type: CommissionSlabType;
  value: number;
}

export interface ICommissionScheme {
  name: string;
  role: Role.Distributor | Role.Retailer;
  service: Service;
  slabs: ICommissionSlab[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommissionEntry {
  txnId: Types.ObjectId;
  userId: Types.ObjectId;
  role: Role;
  service: Service;
  amount: Types.Decimal128;
  status: 'pending' | 'credited' | 'reversed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IKyc {
  userId: Types.ObjectId;
  docType: string;
  docNumber: string;
  provider: KycProvider;
  verifiedData?: Record<string, unknown>;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceConfig {
  service: Service;
  enabled: boolean;
  aggregator: AggregatorProvider;
  minAmount: number;
  maxAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketMessage {
  senderId: Types.ObjectId;
  body: string;
  createdAt: Date;
}

export interface ITicket {
  raisedBy: Types.ObjectId;
  subject: string;
  category: string;
  status: TicketStatus;
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  actorId: Types.ObjectId;
  action: string;
  entity: string;
  entityId?: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFundRequest {
  requesterId: Types.ObjectId;
  requesterRole: Role;
  amount: Types.Decimal128;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVipPlan {
  name: string;
  price: Types.Decimal128;
  benefits: string[];
  commissionMultiplier: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
