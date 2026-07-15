import mongoose, { Schema, model, type Model } from 'mongoose';
import { Role } from '@adhikaripay/config';
import type { IFundRequest } from '../types.js';

const fundRequestSchema = new Schema<IFundRequest>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterRole: { type: String, enum: Object.values(Role), required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    note: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const FundRequest: Model<IFundRequest> =
  mongoose.models.FundRequest ?? model<IFundRequest>('FundRequest', fundRequestSchema);
