import mongoose, { Schema, model, type Model } from 'mongoose';
import { KycProvider } from '@adhikaripay/config';
import type { IKyc } from '../types.js';

const kycSchema = new Schema<IKyc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docType: { type: String, required: true },
    docNumber: { type: String, required: true },
    provider: { type: String, enum: Object.values(KycProvider), required: true },
    verifiedData: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

kycSchema.index({ userId: 1, docType: 1 });

export const Kyc: Model<IKyc> =
  mongoose.models.Kyc ?? model<IKyc>('Kyc', kycSchema);
