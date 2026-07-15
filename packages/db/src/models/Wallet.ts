import mongoose, { Schema, model, type Model } from 'mongoose';
import { Role, CURRENCY } from '@adhikaripay/config';
import type { IWallet } from '../types.js';

const walletSchema = new Schema<IWallet>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerRole: { type: String, enum: Object.values(Role), required: true },
    balance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    holdBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    limit: { type: Number, required: true, default: 500_000 },
    currency: { type: String, default: CURRENCY },
  },
  { timestamps: true },
);

walletSchema.index({ ownerId: 1 }, { unique: true });

export const Wallet: Model<IWallet> =
  mongoose.models.Wallet ?? model<IWallet>('Wallet', walletSchema);
