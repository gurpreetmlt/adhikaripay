import mongoose, { Schema, model, type Model } from 'mongoose';
import { Service, AggregatorProvider } from '@adhikaripay/config';
import type { IServiceConfig } from '../types.js';

const serviceConfigSchema = new Schema<IServiceConfig>(
  {
    service: { type: String, enum: Object.values(Service), required: true, unique: true },
    enabled: { type: Boolean, default: true },
    aggregator: { type: String, enum: Object.values(AggregatorProvider), required: true },
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
  },
  { timestamps: true },
);

export const ServiceConfig: Model<IServiceConfig> =
  mongoose.models.ServiceConfig ??
  model<IServiceConfig>('ServiceConfig', serviceConfigSchema);
