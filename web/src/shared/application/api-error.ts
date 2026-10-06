interface ErrorEnvelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export function parseApiError(response: unknown): string {
  const envelope = response as ErrorEnvelope;
  if (envelope && typeof envelope.code === "string") {
    return envelope.message ? `${envelope.code}: ${envelope.message}` : envelope.code;
  }
  return "Erro inesperado";
}
