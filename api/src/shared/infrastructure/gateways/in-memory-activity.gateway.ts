import { ActivityNotFoundError } from "../../domain/errors/activity-not-found.error.js";
import { ActivityNotOneOffError } from "../../domain/errors/activity-not-one-off.error.js";
import type {
  ActivityGateway,
  ActivitySnapshot,
} from "../../domain/gateways/activity.gateway.js";

interface StoredActivity {
  activityId: string;
  name: string;
  nature: string;
  serviceType: ActivitySnapshot["serviceType"];
  revision: number;
  isActive: boolean;
}

export class InMemoryActivityGateway implements ActivityGateway {
  constructor(private readonly activities: StoredActivity[]) {}

  async requireOneOffActivity(activityId: string): Promise<ActivitySnapshot> {
    const found = this.activities.find((a) => a.activityId === activityId);
    if (!found || !found.isActive) {
      throw new ActivityNotFoundError(activityId);
    }
    if (found.nature !== "ONE_OFF") {
      throw new ActivityNotOneOffError(activityId);
    }
    return found as ActivitySnapshot;
  }

  async listActiveOneOffActivities(): Promise<ActivitySnapshot[]> {
    return this.activities.filter((a) => a.nature === "ONE_OFF" && a.isActive) as ActivitySnapshot[];
  }
}
