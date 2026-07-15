import mongoose, { Schema, model, type Model } from 'mongoose';
import type { IVipPlan } from '../types.js';

const vipPlanSchema = new Schema<IVipPlan>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Schema.Types.Decimal128, required: true },
    benefits: { type: [String], default: [] },
    commissionMultiplier: { type: Number, default: 1, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const VipPlan: Model<IVipPlan> =
  mongoose.models.VipPlan ?? model<IVipPlan>('VipPlan', vipPlanSchema);
