import mongoose, { Schema, model, type Model } from 'mongoose';
import { Role, Service, CommissionSlabType } from '@adhikaripay/config';
import type { ICommissionScheme } from '../types.js';

const commissionSlabSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    type: { type: String, enum: Object.values(CommissionSlabType), required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

const commissionSchemeSchema = new Schema<ICommissionScheme>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: [Role.Distributor, Role.Retailer], required: true },
    service: { type: String, enum: Object.values(Service), required: true },
    slabs: { type: [commissionSlabSchema], required: true, default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

commissionSchemeSchema.index({ role: 1, service: 1, isActive: 1 });

export const CommissionScheme: Model<ICommissionScheme> =
  mongoose.models.CommissionScheme ??
  model<ICommissionScheme>('CommissionScheme', commissionSchemeSchema);
