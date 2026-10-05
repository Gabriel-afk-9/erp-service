const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Dados inválidos. Verifique os campos destacados.",
  CPF_FORMAT_INVALID: "CPF inválido. Confira os 11 dígitos.",
  POSTAL_CODE_INVALID: "CEP inválido. Use 8 dígitos.",
  PERSON_NAME_INVALID: "Nome inválido. Use ao menos 2 caracteres.",
  TEXT_TOO_LONG: "Um campo excede o tamanho máximo permitido.",
  CIVIL_DATE_FORMAT_INVALID: "Data inválida. Use o formato AAAA-MM-DD com data real.",
  INVALID_DATE_RANGE: "Data fora do intervalo permitido (data futura não é aceita).",
  PERSON_ALREADY_MEMBER: "Pessoa já possui vínculo vigente. Verifique a família atual.",
  HOLDER_ALREADY_EXISTS: "Esta família já possui titular vigente.",
  CONCURRENT_MODIFICATION: "Registro alterado por outro usuário. Recarregue e tente de novo.",
  FAMILY_NOT_FOUND: "Família não encontrada.",
  PERSON_NOT_FOUND: "Pessoa não encontrada.",
  MEMBERSHIP_NOT_FOUND: "Vínculo não encontrado.",
};

export function translateRegistrationError(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");
  const code = message.split(":")[0]?.trim() ?? "";
  if (MESSAGES[code]) {
    return MESSAGES[code];
  }
  return message || "Erro inesperado";
}
