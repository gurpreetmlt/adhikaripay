import { Schema, model } from "mongoose";

export type OtpPurpose = "login" | "signup";

export interface OtpSignupMeta {
  name: string;
  sponsorUid: string;
}

export interface OtpRequestDocument {
  mobile: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  /** Present for signup OTPs — name + distributor/sponsor UID. */
  meta?: OtpSignupMeta | null;
}

const MAX_OTP_ATTEMPTS = 5;

const otpRequestSchema = new Schema<OtpRequestDocument>(
  {
    mobile: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, enum: ["login", "signup"], required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    meta: {
      type: {
        name: String,
        sponsorUid: String,
      },
      default: null,
    },
  },
  { versionKey: false },
);

// TTL index — Mongo automatically deletes the document once expiresAt is in the past.
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRequest = model<OtpRequestDocument>("OtpRequest", otpRequestSchema);
export { MAX_OTP_ATTEMPTS };
