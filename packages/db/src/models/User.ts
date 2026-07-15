import mongoose, { Schema, model, type Model } from 'mongoose';
import { Role, UserStatus, KycStatus } from '@adhikaripay/config';
import type { IUser } from '../types.js';

const userSchema = new Schema<IUser>(
  {
    role: { type: String, enum: Object.values(Role), required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    passwordHash: { type: String, required: true },
    txnPinHash: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.Pending,
      index: true,
    },
    kycStatus: {
      type: String,
      enum: Object.values(KycStatus),
      default: KycStatus.Pending,
      index: true,
    },
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ parentId: 1, role: 1 });

export const User: Model<IUser> =
  mongoose.models.User ?? model<IUser>('User', userSchema);
