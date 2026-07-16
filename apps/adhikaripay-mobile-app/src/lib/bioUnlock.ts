import { NativeModules } from "react-native";
import { showAlert } from "../components/AppAlert";
import { createAppStorage } from "./appStorage";
import type { LoginRoleChip } from "../screens/LoginScreen";

const storage = createAppStorage();
const BIO_KEY = "adhikari.bioUnlock.v1";

export type BioUnlockRecord = {
  mobile: string;
  role: LoginRoleChip;
  refreshToken: string;
  enabled: boolean;
};

export async function getBioUnlock(): Promise<BioUnlockRecord | null> {
  try {
    const raw = await storage.getItem(BIO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BioUnlockRecord;
  } catch {
    return null;
  }
}

export async function enableBioUnlock(input: {
  mobile: string;
  role: LoginRoleChip;
  refreshToken: string;
}): Promise<void> {
  const record: BioUnlockRecord = {
    ...input,
    enabled: true,
  };
  await storage.setItem(BIO_KEY, JSON.stringify(record));
}

export async function disableBioUnlock(): Promise<void> {
  await storage.removeItem(BIO_KEY);
}

export async function updateBioRefreshToken(refreshToken: string): Promise<void> {
  const existing = await getBioUnlock();
  if (!existing?.enabled) return;
  await storage.setItem(BIO_KEY, JSON.stringify({ ...existing, refreshToken }));
}

export type BioPromptResult = "success" | "cancel" | "unavailable";

type BiometricsCtor = new (opts?: { allowDeviceCredentials?: boolean }) => {
  isSensorAvailable: () => Promise<{ available: boolean }>;
  simplePrompt: (opts: { promptMessage: string }) => Promise<{ success: boolean }>;
};

function nativeBiometricsPresent(): boolean {
  const mods = NativeModules as Record<string, unknown>;
  return Boolean(mods.ReactNativeBiometrics || mods.RNBiometrics);
}

/**
 * Soft prompt when the native biometric module is not linked / not installed.
 * Never `require()` a missing package — Metro throws "Requiring unknown module undefined".
 */
function softDevPrompt(promptMessage: string): Promise<BioPromptResult> {
  if (!__DEV__) return Promise.resolve("unavailable");
  return new Promise((resolve) => {
    showAlert(promptMessage, "Native biometric module not linked yet. Simulate unlock?", [
      { text: "Cancel", style: "cancel", onPress: () => resolve("cancel") },
      { text: "Simulate OK", style: "primary", onPress: () => resolve("success") },
    ]);
  });
}

/**
 * Phone fingerprint / face unlock.
 * Requires: `npm i react-native-biometrics` + Android rebuild (Mac Terminal).
 */
export async function promptDeviceBiometric(
  promptMessage = "Unlock Adhikari Pay",
): Promise<BioPromptResult> {
  if (!nativeBiometricsPresent()) {
    return softDevPrompt(promptMessage);
  }

  try {
    // Native module exists → JS package must be installed too.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-biometrics") as { default?: BiometricsCtor } & BiometricsCtor;
    const ReactNativeBiometrics = (mod.default ?? mod) as BiometricsCtor;
    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) return softDevPrompt(promptMessage);
    const { success } = await rnBiometrics.simplePrompt({ promptMessage });
    return success ? "success" : "cancel";
  } catch {
    return softDevPrompt(promptMessage);
  }
}
