import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createFamily, searchFamilies, type FamilyListItem } from "../api/families.api.js";
import { registerPerson } from "../api/persons.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";

const LOCALITIES = [
  "São Vicente",
  "Ilha Grande de Santa Isabel",
  "João XXIII",
  "Piauí / Centro",
  "Dom Rufino",
  "Zona Rural (Taboca / Baixa)",
];

const KINSHIP_OPTIONS = [
  "Titular / Própria pessoa de referência",
  "Cônjuge / Companheiro(a)",
  "Filho(a) / Enteado(a)",
  "Outro parente ou dependente",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length === 0 ? "" : `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const STEP_LABELS = ["Família", "Primeiro membro", "Vínculo"];

function Stepper({ screen }: { screen: 1 | 2 }) {
  // Second screen covers member identification and the family tie together.
  const states: Array<"done" | "active" | "todo"> =
    screen === 1 ? ["active", "todo", "todo"] : ["done", "active", "todo"];
  return (
    <nav aria-label="Progresso do cadastro" className="mb-8">
      <ol className="flex w-full items-center">
        {STEP_LABELS.map((label, index) => {
          const state = states[index]!;
          const isLast = index === STEP_LABELS.length - 1;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-sans text-xs font-bold shadow-sm ${
                    state === "todo" ? "bg-surface-low text-text-muted" : "bg-primary text-white"
                  }`}
                >
                  {state === "done" ? (
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      check
                    </span>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`font-sans text-sm font-bold ${
                    state === "active" ? "text-primary" : state === "done" ? "text-text-strong" : "text-text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {isLast ? null : (
                <div className={`mx-sm h-[2px] flex-1 ${state === "done" ? "bg-primary" : "bg-border"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function NewFamilyPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<1 | 2>(1);
  const [created, setCreated] = useState<{ familyId: string; code: string } | null>(null);

  // Screen 1 — family base data.
  const [referenceName, setReferenceName] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationType, setLocationType] = useState<"URBAN" | "RURAL">("URBAN");
  const [contactPhone, setContactPhone] = useState("");
  const [matches, setMatches] = useState<FamilyListItem[] | null>(null);

  // Screen 2 — first member and tie.
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [kinship, setKinship] = useState(KINSHIP_OPTIONS[0]!);
  const [isReference, setIsReference] = useState(true);
  const [validFrom, setValidFrom] = useState(today());

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleDuplicateCheck(): Promise<void> {
    const term = referenceName.trim() || neighborhood.trim() || address.trim();
    if (term.length < 2) {
      setMatches(null);
      setFeedback("Digite ao menos 2 letras da referência, bairro ou endereço para verificar duplicados.");
      return;
    }
    try {
      const result = await searchFamilies({ q: term });
      setMatches(result.items.slice(0, 5));
      setFeedback(null);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    }
  }

  async function handleContinue(): Promise<void> {
    // Family already exists when returning from screen 2; reuse it.
    if (created) {
      setScreen(2);
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const result = await createFamily({
        referenceName: referenceName.trim() || null,
        address: address.trim() || null,
        neighborhood: neighborhood.trim() || null,
        postalCode: postalCode.trim() || null,
        locationType,
        contactPhone: contactPhone.trim() || null,
      });
      setCreated({ familyId: result.familyId, code: result.code });
      setScreen(2);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!created) {
      setFeedback("Volte e conclua os dados da família antes de cadastrar o membro.");
      return;
    }
    if (name.trim().length < 2) {
      setFeedback("Informe o nome completo do primeiro membro.");
      return;
    }
    if (validFrom > today()) {
      setFeedback("O início do vínculo não pode ser uma data futura.");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await registerPerson({
        name: name.trim(),
        birthDate: birthDate || null,
        sex: sex || null,
        cpf: cpf.trim() || null,
        rg: rg.trim() || null,
        contactPhone: memberPhone.trim() || null,
        familyId: created.familyId,
        validFrom,
        relationshipToReference: kinship === KINSHIP_OPTIONS[0] ? "Titular" : kinship,
        isReference,
      });
      navigate(`/families/${created.familyId}`);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[680px] pb-xl">
      {screen === 1 ? (
        <Link
          to="/families"
          className="inline-flex items-center gap-xs font-sans text-sm font-semibold text-text-muted hover:text-text-strong"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
          Voltar para Pessoas e famílias
        </Link>
      ) : (
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setScreen(1)}
            className="inline-flex items-center gap-xs font-sans text-sm font-semibold text-text-muted hover:text-text-strong"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
            Voltar para Família
          </button>
          {created ? (
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Código: {created.code}</span>
          ) : null}
        </div>
      )}

      <header className="mb-8 mt-sm">
        <h1 className="font-display text-[28px] font-semibold leading-[36px] tracking-tight text-text-strong">
          Cadastrar nova família
        </h1>
        <p className="mt-1 font-sans text-sm text-text-muted">
          {screen === 1
            ? "Insira os dados base de localização e identificação para abertura do prontuário."
            : "Identificação do primeiro membro e definição do vínculo com o núcleo familiar."}
        </p>
      </header>

      <Stepper screen={screen} />

      {screen === 1 ? (
        <>
          <div className="rounded-xl bg-surface p-6 shadow-sm sm:p-8">
            <form className="flex flex-col gap-6" onSubmit={(event) => event.preventDefault()}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="family-code">
                    Código familiar
                  </label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-low px-2 py-0.5 font-sans text-xs text-text-muted">
                    <span className="material-symbols-outlined text-[13px] text-primary" aria-hidden="true">
                      lock_clock
                    </span>
                    Gerado automaticamente
                  </span>
                </div>
                <input
                  id="family-code"
                  className="h-11 w-full cursor-default select-all rounded-lg bg-surface-low px-3.5 font-mono text-sm text-text-muted outline-none"
                  value={created?.code ?? ""}
                  placeholder="Disponível após continuar"
                  readOnly
                  tabIndex={-1}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="family-reference">
                  Referência ou nome familiar
                </label>
                <input
                  id="family-reference"
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                  value={referenceName}
                  disabled={created !== null}
                  onChange={(e) => setReferenceName(e.target.value)}
                  maxLength={500}
                />
                <p className="font-sans text-xs text-text-muted">Identificador principal da moradia</p>
              </div>

              {matches !== null && matches.length > 0 ? (
                <div className="rounded-lg border border-aptPendingBorder bg-aptPendingBg p-md">
                  <p className="flex items-center gap-sm font-sans text-sm font-semibold text-aptPendingText">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      warning
                    </span>
                    Possível duplicidade identificada: já existe família cadastrada com referência e localidade semelhantes.
                  </p>
                  <ul className="mt-sm flex flex-col gap-xs">
                    {matches.map((item) => (
                      <li key={item.familyId} className="font-sans text-sm text-aptPendingText">
                        <Link
                          to={`/families/${item.familyId}`}
                          className="font-mono text-xs underline underline-offset-2"
                        >
                          {item.code}
                        </Link>{" "}
                        — {item.referenceName ?? "Sem nome"}
                        {item.neighborhood ? ` · ${item.neighborhood}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {matches !== null && matches.length === 0 ? (
                <p className="font-sans text-sm text-text-muted">Nenhuma família parecida encontrada.</p>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="family-address">
                  Endereço (Rua, Av., Número, Complemento)
                </label>
                <input
                  id="family-address"
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                  placeholder="Ex: Rua São Pedro, nº 140"
                  value={address}
                  disabled={created !== null}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="family-neighborhood">
                    Bairro ou localidade <span aria-hidden="true" className="text-coral">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="family-neighborhood"
                      className="h-11 w-full rounded-lg bg-surface py-sm pl-3.5 pr-9 font-sans text-base text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                      placeholder="Selecione a localidade"
                      value={neighborhood}
                      disabled={created !== null}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      maxLength={500}
                      list="locality-options"
                    />
                    <datalist id="locality-options">
                      {LOCALITIES.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <span
                      className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-text-muted"
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="family-phone">
                    Telefone para contato
                  </label>
                  <div className="relative">
                    <input
                      id="family-phone"
                      type="tel"
                      maxLength={15}
                      className="h-11 w-full rounded-lg bg-surface py-sm pl-3.5 pr-9 font-mono text-sm text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                      placeholder="(86) 90000-0000"
                      value={contactPhone}
                      disabled={created !== null}
                      onChange={(e) => setContactPhone(maskPhone(e.target.value))}
                    />
                    <span
                      className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted"
                      aria-hidden="true"
                    >
                      call
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="family-postal">
                    CEP (8 dígitos)
                  </label>
                  <input
                    id="family-postal"
                    inputMode="numeric"
                    maxLength={50}
                    className="h-11 w-full rounded-lg bg-surface px-3.5 font-mono text-sm text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                    placeholder="60000001"
                    value={postalCode}
                    disabled={created !== null}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="family-location">
                    Tipo de localidade
                  </label>
                  <select
                    id="family-location"
                    className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none"
                    value={locationType}
                    disabled={created !== null}
                    onChange={(e) => setLocationType(e.target.value as "URBAN" | "RURAL")}
                  >
                    <option value="URBAN">Urbano</option>
                    <option value="RURAL">Rural</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => void handleDuplicateCheck()}
                  className="font-sans text-sm font-semibold text-primary-action underline underline-offset-2"
                >
                  Verificar duplicados antes de cadastrar
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 flex items-center justify-between px-2 font-sans text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Rascunho local seguro em edição
            </span>
            <span>Unidade de Atendimento: Parnaíba (PI)</span>
          </div>
        </>
      ) : (
        <form onSubmit={(event) => void handleFinish(event)}>
          <div className="rounded-xl bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-name">
                  Nome completo <span aria-hidden="true" className="text-coral">*</span>
                </label>
                <input
                  id="member-name"
                  required
                  minLength={2}
                  maxLength={200}
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none transition-all placeholder:text-text-muted focus:shadow-md"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-birth">
                  Data de nascimento
                </label>
                <input
                  id="member-birth"
                  type="date"
                  max={today()}
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <p className="flex items-center gap-1 font-sans text-xs text-text-muted">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    info
                  </span>
                  Não informado — o cadastro pode continuar
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-sex">
                  Sexo
                </label>
                <select
                  id="member-sex"
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as "" | "MALE" | "FEMALE" | "OTHER")}
                >
                  <option value="">—</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="member-doc">
                    Documento (CPF ou RG) (Opcional)
                  </label>
                  <input
                    id="member-doc"
                    inputMode="numeric"
                    maxLength={50}
                    className="h-11 w-full rounded-lg bg-surface px-3.5 font-mono text-sm text-text shadow-sm outline-none placeholder:text-text-muted"
                    placeholder="Apenas dígitos do CPF"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-semibold text-text" htmlFor="member-rg">
                    RG (Opcional)
                  </label>
                  <input
                    id="member-rg"
                    maxLength={30}
                    className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none placeholder:text-text-muted"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-phone">
                  Telefone para contato (Opcional)
                </label>
                <input
                  id="member-phone"
                  type="tel"
                  maxLength={15}
                  className="h-11 w-full rounded-lg bg-surface px-3.5 font-mono text-sm text-text shadow-sm outline-none placeholder:text-text-muted"
                  placeholder="(86) 90000-0000"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(maskPhone(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-kinship">
                  Parentesco com a referência <span aria-hidden="true" className="text-coral">*</span>
                </label>
                <div className="relative">
                  <select
                    id="member-kinship"
                    required
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-surface py-sm pl-3.5 pr-9 font-sans text-base text-text shadow-sm outline-none"
                    value={kinship}
                    onChange={(e) => setKinship(e.target.value)}
                  >
                    {KINSHIP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span
                    className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-text-muted"
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-md rounded-lg bg-surface-low p-md">
                <div>
                  <p className="font-sans text-sm font-semibold text-text-strong">Pessoa de referência da família</p>
                  <p className="font-sans text-xs text-text-muted">
                    Titular responsável pelos atendimentos e entregas do núcleo familiar
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isReference}
                  aria-label="Pessoa de referência da família"
                  onClick={() => setIsReference((value) => !value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isReference ? "bg-primary" : "bg-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isReference ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-semibold text-text" htmlFor="member-start">
                  Início do vínculo <span aria-hidden="true" className="text-coral">*</span>
                </label>
                <div className="relative">
                  <input
                    id="member-start"
                    type="date"
                    required
                    max={today()}
                    className="h-11 w-full rounded-lg bg-surface px-3.5 font-sans text-base text-text shadow-sm outline-none"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <p className="font-sans text-xs text-text-muted">Data de abertura da assistência (datas futuras não permitidas)</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-surface p-6">
            <p className="flex items-center gap-sm font-sans text-sm font-bold text-text-strong">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                verified
              </span>
              Resumo do cadastro
            </p>
            <dl className="mt-sm grid gap-xs font-sans text-sm">
              <div className="flex gap-sm">
                <dt className="w-40 shrink-0 text-text-muted">Código:</dt>
                <dd className="font-mono text-xs text-text-strong">{created?.code ?? "—"}</dd>
              </div>
              <div className="flex gap-sm">
                <dt className="w-40 shrink-0 text-text-muted">Referência da moradia:</dt>
                <dd className="text-text-strong">{referenceName.trim() || "—"}</dd>
              </div>
              <div className="flex gap-sm">
                <dt className="w-40 shrink-0 text-text-muted">Localidade:</dt>
                <dd className="text-text-strong">
                  {neighborhood.trim() || "—"}
                  {neighborhood.trim() ? ", Parnaíba (PI)" : ""}
                </dd>
              </div>
              <div className="flex gap-sm">
                <dt className="w-40 shrink-0 text-text-muted">Primeiro membro:</dt>
                <dd className="text-text-strong">
                  {name.trim() || "—"}
                  {name.trim() && isReference ? " (Pessoa de referência)" : ""}
                </dd>
              </div>
              <div className="flex gap-sm">
                <dt className="w-40 shrink-0 text-text-muted">Início da assistência:</dt>
                <dd className="text-text-strong">{validFrom ? formatDate(validFrom) : "—"}</dd>
              </div>
            </dl>
          </div>

          {feedback ? <Alert tone="error" message={feedback} /> : null}

          <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-xl bg-surface/95 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setScreen(1)}
              className="inline-flex h-10 items-center justify-center rounded-lg px-5 font-sans text-sm font-semibold text-text-muted transition-colors hover:bg-surface-low hover:text-text-strong"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-container hover:shadow active:scale-[0.99] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                check_circle
              </span>
              {loading ? "Cadastrando..." : "Concluir cadastro"}
            </button>
          </div>
        </form>
      )}

      {screen === 1 ? (
        <>
          {feedback ? <Alert tone="error" message={feedback} /> : null}
          <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-xl bg-surface/95 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] backdrop-blur-md">
            <Link
              to="/families"
              className="inline-flex h-10 items-center justify-center rounded-lg px-5 font-sans text-sm font-semibold text-text-muted transition-colors hover:bg-surface-low hover:text-text-strong"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={loading}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-container hover:shadow active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Continuar"}
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
