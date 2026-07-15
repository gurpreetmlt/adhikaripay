import { MockAdapterBase } from "./mock.base";

// Stub until Eko onboarding completes. Real implementation replaces the
// MockAdapterBase methods with HTTP calls (auth headers, request signing per
// Eko docs) while keeping the same ProviderAdapter contract — nothing above
// this layer changes.
export class EkoAdapter extends MockAdapterBase {
  readonly code = "eko";
}
