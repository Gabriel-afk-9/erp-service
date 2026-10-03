import { DomainError } from "./domain.error.js";

export class ActivityNotOneOffError extends DomainError {
  readonly code = "ACTIVITY_NOT_ONE_OFF";

  constructor(activityId: string) {
    super(`Activity is not a one-off service activity: ${activityId}`);
  }
}
