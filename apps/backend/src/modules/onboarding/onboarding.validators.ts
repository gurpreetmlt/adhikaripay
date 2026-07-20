import { z } from "zod";

/**
 * InstantPay Signup Min-KYC input. Name + DOB must match PAN records; mobile and
 * address must match Aadhaar records (InstantPay rejects mismatches).
 */
export const minKycSignupSchema = z.object({
  /** Aadhaar-linked 10-digit mobile (sent to InstantPay). */
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  name: z.string().min(2).max(120),
  gender: z.enum(["M", "F", "T"]),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN format"),
  email: z.string().email().max(150),
  address: z.object({
    full: z.string().min(5).max(255),
    city: z.string().min(2).max(80),
    pincode: z.string().regex(/^\d{6}$/),
  }),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export type MinKycSignupInput = z.infer<typeof minKycSignupSchema>;

/** spKey — InstantPay service key: DMI = DMT rail, WAP = AePS rail. */
export const bioKycStatusSchema = z.object({
  spKey: z.enum(["DMI", "WAP"]),
});

export type BioKycStatusInput = z.infer<typeof bioKycStatusSchema>;

/**
 * Merchant Biometric KYC submit. Capture must use the `pidOptionWadh` from the
 * bio-KYC status response inside PidOptions (wadh attribute).
 */
export const bioKycSubmitSchema = z.object({
  /** From the bio-KYC status response (referenceKeyType OutletBiometicKyc). */
  referenceKey: z.string().min(10).max(255),
  /** RD-service PidData XML (or JSON biometric blob in tests). */
  biometricPayload: z.string().min(20),
  /** Mandatory only when bio-KYC status returned an empty outletAadhaarNumber. */
  aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type BioKycSubmitInput = z.infer<typeof bioKycSubmitSchema>;

/** Outlet mobile change initiate — OTP goes to BOTH existing and new numbers. */
export const mobileChangeInitiateSchema = z.object({
  /** Defaults to the logged-in user's registered mobile when omitted. */
  existingMobileNumber: z.string().regex(/^\d{10}$/).optional(),
  newMobileNumber: z.string().regex(/^\d{10}$/),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type MobileChangeInitiateInput = z.infer<typeof mobileChangeInitiateSchema>;

/** Outlet mobile change validate — otpReferenceID + hash come from the initiate response. */
export const mobileChangeVerifySchema = z.object({
  otpReferenceID: z.string().min(8).max(255),
  otp: z.string().regex(/^\d{4,8}$/),
  hash: z.string().min(8).max(1024),
});

export type MobileChangeVerifyInput = z.infer<typeof mobileChangeVerifySchema>;

/** Merchant List (admin) — partner-wide list of onboarded outlets with optional filters. */
export const merchantListSchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  recordsPerPage: z.coerce.number().int().min(1).max(100).default(10),
  outletId: z.coerce.number().int().min(0).optional(),
  mobile: z.string().regex(/^\d{10}$/).optional(),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional(),
});

export type MerchantListInput = z.infer<typeof merchantListSchema>;
