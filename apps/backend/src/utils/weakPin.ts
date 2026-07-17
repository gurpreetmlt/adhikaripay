import { HttpError } from "./httpError";

const WEAK_4_DIGIT = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "1212",
  "2121",
  "1122",
  "2211",
  "1000",
  "0001",
]);

/** Reject trivially guessable 4-digit login / txn PINs. */
export function assertStrongPin(pin: string, label = "PIN"): void {
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpError(422, `${label} must be 4 digits`, "INVALID_PIN_FORMAT");
  }
  if (WEAK_4_DIGIT.has(pin)) {
    throw new HttpError(422, `Choose a stronger ${label} — avoid sequences and repeats`, "WEAK_PIN");
  }
}
