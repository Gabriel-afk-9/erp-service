import { get, patch, post } from "../../../../shared/application/api-client";

export interface PersonListItem {
  personId: string;
  name: string;
  birthDate: string | null;
  currentFamilyId: string | null;
  currentFamilyCode: string | null;
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

export async function searchPersons(params: { q?: string; page?: number; pageSize?: number }): Promise<{ items: PersonListItem[]; total: number; page: number; pageSize: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/persons${suffix}`)) as Envelope;
  const data = result.data as { items?: PersonListItem[]; total?: number; page?: number; pageSize?: number } | undefined;
  if (!data || !Array.isArray(data.items)) throw new Error(readApiError(result));
  return { items: data.items, total: data.total ?? data.items.length, page: data.page ?? 1, pageSize: data.pageSize ?? 20 };
}

export interface RegisterPersonInput {
  name: string;
  birthDate?: string | null;
  sex?: "MALE" | "FEMALE" | "OTHER" | null;
  cpf?: string | null;
  rg?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  contactPhone?: string | null;
  familyId: string;
  validFrom: string;
  relationshipToReference?: string | null;
  isReference: boolean;
}

export async function registerPerson(input: RegisterPersonInput): Promise<{ personId: string; membershipId: string }> {
  const result = (await post("/persons", input)) as Envelope;
  const data = result.data as { personId?: string; membershipId?: string } | undefined;
  if (!data || typeof data.personId !== "string") throw new Error(readApiError(result));
  return data as { personId: string; membershipId: string };
}

export async function correctPerson(personId: string, input: { name?: string; contactPhone?: string | null; occupation?: string | null; educationLevel?: string | null; reason: string; expectedRevision: number }): Promise<{ personId: string; revision: number }> {
  const result = (await patch(`/persons/${encodeURIComponent(personId)}`, input)) as Envelope;
  const data = result.data as { personId?: string; revision?: number } | undefined;
  if (!data || typeof data.revision !== "number") throw new Error(readApiError(result));
  return data as { personId: string; revision: number };
}
