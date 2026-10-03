import { get, patch, post } from "../../../../shared/application/api-client";

export interface FamilyListItem {
  familyId: string;
  code: string;
  referenceName: string | null;
  neighborhood: string | null;
  memberCount: number;
}

export interface FamilyMemberItem {
  membershipId: string;
  personId: string;
  personName: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  revision: number;
}

export interface FamilyDetail {
  familyId: string;
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  locationType: "URBAN" | "RURAL";
  contactPhone: string | null;
  revision: number;
  memberCount: number;
  members: FamilyMemberItem[];
}

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export function readApiError(result: unknown): string {
  const envelope = result as Envelope;
  if (typeof envelope?.code === "string") {
    return envelope.message ? `${envelope.code}: ${envelope.message}` : envelope.code;
  }
  return "Erro inesperado";
}

export async function searchFamilies(params: { q?: string; page?: number; pageSize?: number }): Promise<{ items: FamilyListItem[]; total: number; page: number; pageSize: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/families${suffix}`)) as Envelope;
  const data = result.data as { items?: FamilyListItem[]; total?: number; page?: number; pageSize?: number } | undefined;
  if (!data || !Array.isArray(data.items)) throw new Error(readApiError(result));
  return { items: data.items, total: data.total ?? data.items.length, page: data.page ?? 1, pageSize: data.pageSize ?? 20 };
}

export async function getFamily(familyId: string): Promise<FamilyDetail> {
  const result = (await get(`/families/${encodeURIComponent(familyId)}`)) as Envelope;
  const data = result.data as FamilyDetail | undefined;
  if (!data || typeof data.familyId !== "string") throw new Error(readApiError(result));
  return data;
}

export interface CreateFamilyInput {
  referenceName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  locationType: "URBAN" | "RURAL";
  contactPhone?: string | null;
}

export async function createFamily(input: CreateFamilyInput): Promise<{ familyId: string; code: string; revision: number }> {
  const result = (await post("/families", input)) as Envelope;
  const data = result.data as { familyId?: string; code?: string; revision?: number } | undefined;
  if (!data || typeof data.familyId !== "string") throw new Error(readApiError(result));
  return data as { familyId: string; code: string; revision: number };
}

export async function correctFamily(familyId: string, input: { referenceName?: string | null; address?: string | null; neighborhood?: string | null; postalCode?: string | null; locationType?: "URBAN" | "RURAL"; contactPhone?: string | null; reason: string; expectedRevision: number }): Promise<{ familyId: string; revision: number }> {
  const result = (await patch(`/families/${encodeURIComponent(familyId)}`, input)) as Envelope;
  const data = result.data as { familyId?: string; revision?: number } | undefined;
  if (!data || typeof data.revision !== "number") throw new Error(readApiError(result));
  return data as { familyId: string; revision: number };
}

export async function addFamilyMember(familyId: string, input: { personId: string; validFrom: string; relationshipToReference?: string | null; isReference: boolean }): Promise<{ membershipId: string }> {
  const result = (await post(`/families/${encodeURIComponent(familyId)}/members`, input)) as Envelope;
  const data = result.data as { membershipId?: string } | undefined;
  if (!data || typeof data.membershipId !== "string") throw new Error(readApiError(result));
  return data as { membershipId: string };
}

export async function closeMembership(membershipId: string, input: { validUntil: string; reason: string; expectedRevision: number }): Promise<void> {
  const result = (await post(`/memberships/${encodeURIComponent(membershipId)}/closure`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}
