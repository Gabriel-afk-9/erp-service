import { ActivityNotFoundError } from "../../../../shared/domain/errors/activity-not-found.error.js";
import { ActivityNotOneOffError } from "../../../../shared/domain/errors/activity-not-one-off.error.js";
import type { ActivityGateway, ActivitySnapshot } from "../../../../shared/domain/gateways/activity.gateway.js";
import type { FamilySnapshot, MembershipSnapshot, RegistryGateway } from "../../../../shared/domain/gateways/registry.gateway.js";
import type { HomeVisit } from "../../domain/entities/home-visit.entity.js";
import type { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import type {
  ServiceRecordAuditInput,
  ServiceRecordDateFilter,
  ServiceRecordDetail,
  ServiceRecordRepository,
} from "../../domain/repositories/service-record.repository.js";

export class FakeServiceRecordRepository implements ServiceRecordRepository {
  readonly store = new Map<string, ServiceRecordDetail>();
  readonly audits: ServiceRecordAuditInput[] = [];

  async save(record: ServiceRecord, homeVisit: HomeVisit | null, audit: ServiceRecordAuditInput): Promise<void> {
    this.store.set(record.id, { record, homeVisit });
    this.audits.push(audit);
  }

  async findById(id: string): Promise<ServiceRecordDetail | null> {
    return this.store.get(id) ?? null;
  }

  async findByFamily(familyId: string, filter?: ServiceRecordDateFilter): Promise<ServiceRecordDetail[]> {
    return [...this.store.values()].filter(({ record }) => {
      if (record.familyId !== familyId) return false;
      if (filter?.from !== undefined && record.occurredAt < filter.from) return false;
      if (filter?.to !== undefined && record.occurredAt > filter.to) return false;
      return true;
    });
  }
}

export function stubActivity(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    activityId: "act-001",
    name: "Atendimento medico avulso",
    nature: "ONE_OFF",
    serviceType: { serviceTypeId: "st-medical", code: "MEDICAL", name: "Atendimento medico" },
    revision: 1,
    isActive: true,
    ...overrides,
  };
}

export interface TestActivity extends Omit<ActivitySnapshot, "nature"> {
  nature: string;
}

export class StubActivityGateway implements ActivityGateway {
  constructor(private readonly activities: TestActivity[]) {}

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

export class StubRegistryGateway implements RegistryGateway {
  constructor(
    private readonly families: FamilySnapshot[],
    private readonly memberships: MembershipSnapshot[],
  ) {}

  async findFamily(familyId: string): Promise<FamilySnapshot | null> {
    return this.families.find((f) => f.familyId === familyId) ?? null;
  }

  async findFamiliesByQuery(): Promise<FamilySnapshot[]> {
    return [];
  }

  async resolveMembership(personId: string, asOf: string): Promise<MembershipSnapshot | null> {
    return (
      this.memberships.find(
        (m) =>
          m.personId === personId && m.startDate <= asOf && (m.endDate === null || m.endDate > asOf),
      ) ?? null
    );
  }

  async listActiveMemberships(): Promise<MembershipSnapshot[]> {
    return [];
  }
}

export function stubFamily(familyId = "fam-001"): FamilySnapshot {
  return {
    familyId,
    familyNumber: "001",
    address: { street: "Rua Ficticia", neighborhood: "Bairro", zipCode: "60000-000", locationType: "URBAN" },
    phone: null,
    revision: 1,
  };
}

export function stubMembership(overrides: Partial<MembershipSnapshot> = {}): MembershipSnapshot {
  return {
    membershipId: "mem-001",
    familyId: "fam-001",
    personId: "per-001",
    personName: "Membro 01",
    relationship: "holder",
    isHolder: true,
    startDate: "2024-01-01",
    endDate: null,
    revision: 1,
    ...overrides,
  };
}
