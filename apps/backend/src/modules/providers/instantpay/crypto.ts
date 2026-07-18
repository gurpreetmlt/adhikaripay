import { createCipheriv } from "node:crypto";
import { env } from "../../../config/env";

/**
 * InstantPay encryptedAadhaar: AES-256-CBC, PKCS7, base64 ciphertext.
 * Key: INSTANTPAY_AES_KEY as 32 utf8 bytes, or base64-decoded 32 bytes.
 * IV: 16 zero bytes (common InstantPay partner integration default).
 */
export function encryptInstantPayAadhaar(aadhaarNumber: string): string {
  const key = resolveAesKey();
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(aadhaarNumber, "utf8"), cipher.final()]).toString("base64");
}

function resolveAesKey(): Buffer {
  const raw = env.INSTANTPAY_AES_KEY;
  if (!raw) throw new Error("INSTANTPAY_AES_KEY is not configured");
  if (raw.length === 32) return Buffer.from(raw, "utf8");
  const fromB64 = Buffer.from(raw, "base64");
  if (fromB64.length === 32) return fromB64;
  throw new Error("INSTANTPAY_AES_KEY must be 32 utf8 characters or base64 of 32 bytes");
}
