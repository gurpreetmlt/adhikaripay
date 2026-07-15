import { MockAdapterBase } from "./mock.base";

// Stub until PaySprint onboarding completes — see EkoAdapter note.
export class PaySprintAdapter extends MockAdapterBase {
  readonly code = "paysprint";
}
