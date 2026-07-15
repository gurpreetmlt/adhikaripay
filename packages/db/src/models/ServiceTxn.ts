import mongoose, { Schema, model, type Model } from 'mongoose';
import { Service, AggregatorProvider, TxnStatus } from '@adhikaripay/config';
import type { IServiceTxn } from '../types.js';

const serviceTxnSchema = new Schema<IServiceTxn>(
  {
    retailerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: String, enum: Object.values(Service), required: true, index: true },
    aggregator: { type: String, enum: Object.values(AggregatorProvider), required: true },
    aggregatorTxnId: { type: String, index: true },
    status: {
      type: String,
      enum: Object.values(TxnStatus),
      default: TxnStatus.Pending,
      index: true,
    },
    amount: { type: Schema.Types.Decimal128, required: true },
    customerRef: { type: String },
    requestPayload: { type: Schema.Types.Mixed },
    responsePayload: { type: Schema.Types.Mixed },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

serviceTxnSchema.index({ retailerId: 1, createdAt: -1 });
serviceTxnSchema.index({ status: 1, createdAt: -1 });

export const ServiceTxn: Model<IServiceTxn> =
  mongoose.models.ServiceTxn ?? model<IServiceTxn>('ServiceTxn', serviceTxnSchema);
