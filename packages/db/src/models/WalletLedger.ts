import mongoose, { Schema, model, type Model } from 'mongoose';
import { LedgerType, LedgerRefType } from '@adhikaripay/config';
import type { IWalletLedger } from '../types.js';

const walletLedgerSchema = new Schema<IWalletLedger>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    type: { type: String, enum: Object.values(LedgerType), required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    balanceAfter: { type: Schema.Types.Decimal128, required: true },
    reason: { type: String, required: true },
    refType: { type: String, enum: Object.values(LedgerRefType), required: true },
    refId: { type: Schema.Types.ObjectId },
    idempotencyKey: { type: String, required: true, unique: true },
    counterpartyWalletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
  },
  { timestamps: true },
);

walletLedgerSchema.index({ walletId: 1, createdAt: -1 });
walletLedgerSchema.index({ refType: 1, refId: 1 });

export const WalletLedger: Model<IWalletLedger> =
  mongoose.models.WalletLedger ??
  model<IWalletLedger>('WalletLedger', walletLedgerSchema);
