import mongoose, { Schema, model, type Model } from 'mongoose';
import { Role, Service } from '@adhikaripay/config';
import type { ICommissionEntry } from '../types.js';

const commissionEntrySchema = new Schema<ICommissionEntry>(
  {
    txnId: { type: Schema.Types.ObjectId, ref: 'ServiceTxn', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: Object.values(Role), required: true },
    service: { type: String, enum: Object.values(Service), required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['pending', 'credited', 'reversed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

commissionEntrySchema.index({ userId: 1, createdAt: -1 });

export const CommissionEntry: Model<ICommissionEntry> =
  mongoose.models.CommissionEntry ??
  model<ICommissionEntry>('CommissionEntry', commissionEntrySchema);
