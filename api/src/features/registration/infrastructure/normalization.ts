export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function buildFamilySearchText(fields: {
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
}): string {
  return normalizeSearchText(
    [fields.code, fields.referenceName ?? "", fields.address ?? "", fields.neighborhood ?? ""].join(" "),
  );
}

export function buildPersonSearchText(fields: { name: string; cpf: string | null }): string {
  return normalizeSearchText([fields.name, fields.cpf ?? ""].join(" "));
}
