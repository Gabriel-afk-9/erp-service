import { DomainError } from "./domain.error.js";

export class ActivityNotFoundError extends DomainError {
  readonly code = "ACTIVITY_NOT_FOUND";

  constructor(activityId: string) {
    super(`Activity not found: ${activityId}`);
  }
}
