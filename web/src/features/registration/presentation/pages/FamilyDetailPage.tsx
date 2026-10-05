import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { Drawer } from "../../../../shared/presentation/components/Drawer.js";
import { EmptyState } from "../../../../shared/presentation/components/EmptyState.js";
import { StatusTag } from "../../../../shared/presentation/components/StatusTag.js";
import { addFamilyMember, closeMembership, correctFamily, getFamily, type FamilyDetail } from "../api/families.api.js";
import { getPerson, searchPersons } from "../api/persons.api.js";
import { getServiceRecord, listServiceRecords, type ServiceRecordItem } from "../../../atd/presentation/api/service-records.api.js";
import { listDeliveries, type DeliveryListItem } from "../../../deliveries/presentation/api/deliveries.api.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const date = value.slice(0, 10);
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function ageOf(birthDate: string | null): string {
  if (!birthDate) return "—";
  const born = new Date(birthDate.slice(0, 10));
  if (Number.isNaN(born.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age < 0 ? "—" : `${age} anos`;
}

type Tab = "overview" | "members" | "history" | "social";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Visão geral" },
  { id: "members", label: "Membros" },
  { id: "history", label: "Histórico" },
  { id: "social", label: "Ficha social" },
];

interface TimelineEntry {
  key: string;
  date: string;
  title: string;
  detail: string;
  tag: { tone: "neutral" | "pending" | "info"; icon: string; label: string };
  deliveryId: string | null;
  serviceRecordId: string | null;
}

function closeMenu(element: HTMLElement): void {
  const menu = element.closest("details");
  if (menu) menu.removeAttribute("open");
}

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editFields, setEditFields] = useState({ referenceName: "", address: "", neighborhood: "", postalCode: "", contactPhone: "", locationType: "URBAN" });
  const [personInfo, setPersonInfo] = useState<Record<string, { birthDate: string | null; contactPhone: string | null }>>({});
  const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);
  const [services, setServices] = useState<ServiceRecordItem[]>([]);
  const [serviceDetail, setServiceDetail] = useState<ServiceRecordItem | null>(null);

  // Membros tab — add existing person.
  const [addingMember, setAddingMember] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<{ personId: string; name: string; currentFamilyCode: string | null }[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [validFrom, setValidFrom] = useState(today());
  const [relationship, setRelationship] = useState("");
  const [isReference, setIsReference] = useState(false);
  const [closureTarget, setClosureTarget] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getFamily(id);
      setFamily(data);
      setEditFields({
        referenceName: data.referenceName ?? "",
        address: data.address ?? "",
        neighborhood: data.neighborhood ?? "",
        postalCode: data.postalCode ?? "",
        contactPhone: data.contactPhone ?? "",
        locationType: data.locationType,
      });
      try {
        setDeliveries((await listDeliveries(id)).deliveries);
      } catch {
        setDeliveries([]);
      }
      try {
        setServices(await listServiceRecords(id));
      } catch {
        setServices([]);
      }
      // Best-effort enrichment for age and contact display.
      void (async () => {
        const entries = await Promise.all(
          data.members
            .filter((member) => member.isActive)
            .map(async (member) => {
              try {
                const person = await getPerson(member.personId);
                return [member.personId, { birthDate: person.birthDate, contactPhone: person.contactPhone }] as const;
              } catch {
                return [member.personId, { birthDate: null, contactPhone: null }] as const;
              }
            }),
        );
        setPersonInfo(Object.fromEntries(entries));
      })();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCorrect(): Promise<void> {
    if (!family) return;
    setLoading(true);
    try {
      await correctFamily(family.familyId, {
        referenceName: editFields.referenceName.trim() || null,
        address: editFields.address.trim() || null,
        neighborhood: editFields.neighborhood.trim() || null,
        postalCode: editFields.postalCode.trim() || null,
        locationType: editFields.locationType === "RURAL" ? "RURAL" : "URBAN",
        contactPhone: editFields.contactPhone.trim() || null,
        reason: editReason.trim(),
        expectedRevision: family.revision,
      });
      setEditing(false);
      setEditReason("");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchPerson(): Promise<void> {
    try {
      const result = await searchPersons({ q: addQuery.trim() || undefined });
      setAddResults(result.items.map((p) => ({ personId: p.personId, name: p.name, currentFamilyCode: p.currentFamilyCode })));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  async function handleAddMember(): Promise<void> {
    if (!family || !selectedPersonId) return;
    setLoading(true);
    try {
      await addFamilyMember(family.familyId, { personId: selectedPersonId, validFrom, relationshipToReference: relationship.trim() || null, isReference });
      setSelectedPersonId("");
      setAddQuery("");
      setAddResults([]);
      setAddingMember(false);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleClosure(values: Record<string, string>): Promise<void> {
    if (!closureTarget || !family) return;
    const target = family.members.find((m) => m.membershipId === closureTarget);
    if (!target) return;
    setLoading(true);
    try {
      await closeMembership(closureTarget, { validUntil: values.validUntil ?? today(), reason: values.reason ?? "", expectedRevision: target.revision });
      setClosureTarget(null);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!family && loading) return <p className="font-sans text-sm text-text-muted">Carregando...</p>;
  if (!family) return <Alert tone="error" message={feedback ?? "Família não encontrada"} />;

  const activeMembers = family.members.filter((member) => member.isActive);
  const closedMembers = family.members.filter((member) => !member.isActive);
  const hasActiveTie = activeMembers.length > 0;
  const displayName = family.referenceName ?? `Família ${family.code}`;

  const timeline: TimelineEntry[] = [
    ...deliveries.map((delivery) => ({
      key: `delivery-${delivery.deliveryId}`,
      date: delivery.occurredAt.slice(0, 10),
      title: "Entrega",
      detail: delivery.status === "COMPLETED" ? "Entrega concluída" : "Entrega estornada",
      tag:
        delivery.status === "COMPLETED"
          ? ({ tone: "neutral", icon: "check_circle", label: "Concluído" } as const)
          : ({ tone: "pending", icon: "history", label: "Estornada" } as const),
      deliveryId: delivery.deliveryId,
      serviceRecordId: null,
    })),
    ...services.map((record) => ({
      key: `service-${record.serviceRecordId}`,
      date: record.occurredAt.slice(0, 10),
      title: record.serviceTypeName,
      detail:
        record.status === "CANCELED"
          ? `Cancelado — ${record.executorName}`
          : record.hasHomeVisit
            ? `Visita domiciliar — ${record.executorName}`
            : `Realizado por ${record.executorName}`,
      tag:
        record.status === "CANCELED"
          ? ({ tone: "pending", icon: "cancel", label: "Cancelado" } as const)
          : record.hasHomeVisit
            ? ({ tone: "info", icon: "home", label: "Visita" } as const)
            : ({ tone: "neutral", icon: "check_circle", label: "Realizado" } as const),
      deliveryId: null,
      serviceRecordId: record.serviceRecordId,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const latest = timeline[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Link
        to="/families"
        className="inline-flex items-center gap-xs font-sans text-sm font-semibold text-text-muted hover:text-text-strong"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          arrow_back
        </span>
        Voltar para Pessoas e famílias
      </Link>

      <div className="mt-sm flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="font-display text-[28px] font-semibold leading-[36px] tracking-tight text-text-strong">
              {displayName}
            </h1>
            {hasActiveTie ? (
              <StatusTag tone="eligible" icon="check_circle" label="Ativo" />
            ) : (
              <StatusTag tone="pending" icon="schedule" label="Sem vínculo vigente" />
            )}
          </div>
          <p className="mt-xs font-sans text-sm text-text-muted">
            <span className="font-semibold text-text">Código:</span>{" "}
            <span className="font-mono text-xs">{family.code}</span>
            {" • "}
            <span className="font-semibold text-text">Referência atual:</span> {family.referenceName ?? "—"}
            {" • "}
            <span className="font-semibold text-text">Localidade:</span> {family.neighborhood ?? "—"}, Parnaíba (PI)
          </p>
        </div>
        <details className="relative">
          <summary className="inline-flex h-[40px] cursor-pointer list-none items-center gap-xs rounded-md border border-border bg-surface px-md font-sans text-sm font-semibold text-text-strong hover:bg-background [&::-webkit-details-marker]:hidden">
            Mais ações
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_drop_down
            </span>
          </summary>
          <div className="absolute right-0 z-10 mt-xs flex w-64 flex-col rounded-lg border border-border bg-surface p-sm shadow-[0_12px_32px_-4px_rgba(60,48,30,0.12)]">
            <button
              type="button"
              onClick={(event) => {
                setEditing(true);
                closeMenu(event.currentTarget);
              }}
              className="flex items-center gap-sm rounded-md px-sm py-sm text-left font-sans text-sm text-text hover:bg-background"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">
                edit_document
              </span>
              Editar dados cadastrais
            </button>
            <button
              type="button"
              onClick={(event) => {
                window.print();
                closeMenu(event.currentTarget);
              }}
              className="flex items-center gap-sm rounded-md px-sm py-sm text-left font-sans text-sm text-text hover:bg-background"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">
                print
              </span>
              Imprimir página
            </button>
            <Link
              to="/attendance"
              className="flex items-center gap-sm rounded-md px-sm py-sm font-sans text-sm text-text hover:bg-background"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">
                add_circle
              </span>
              Registrar atendimento
            </Link>
          </div>
        </details>
      </div>

      {editing ? (
        <div className="mt-md rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-text-strong">Editar dados cadastrais</h2>
          <div className="mt-sm grid gap-md md:grid-cols-2">
            <label className="block font-sans text-sm font-semibold text-text">
              Referência
              <input className="field-input mt-xs font-normal" value={editFields.referenceName} onChange={(e) => setEditFields({ ...editFields, referenceName: e.target.value })} />
            </label>
            <label className="block font-sans text-sm font-semibold text-text">
              Endereço
              <input className="field-input mt-xs font-normal" value={editFields.address} onChange={(e) => setEditFields({ ...editFields, address: e.target.value })} />
            </label>
            <label className="block font-sans text-sm font-semibold text-text">
              Bairro
              <input className="field-input mt-xs font-normal" value={editFields.neighborhood} onChange={(e) => setEditFields({ ...editFields, neighborhood: e.target.value })} />
            </label>
            <label className="block font-sans text-sm font-semibold text-text">
              CEP
              <input className="field-input mt-xs font-mono font-normal" value={editFields.postalCode} onChange={(e) => setEditFields({ ...editFields, postalCode: e.target.value })} />
            </label>
            <label className="block font-sans text-sm font-semibold text-text">
              Telefone
              <input className="field-input mt-xs font-normal" value={editFields.contactPhone} onChange={(e) => setEditFields({ ...editFields, contactPhone: e.target.value })} />
            </label>
            <label className="block font-sans text-sm font-semibold text-text">
              Tipo de localidade
              <select className="field-input mt-xs font-normal" value={editFields.locationType} onChange={(e) => setEditFields({ ...editFields, locationType: e.target.value })}>
                <option value="URBAN">Urbano</option>
                <option value="RURAL">Rural</option>
              </select>
            </label>
          </div>
          <label className="mt-md block font-sans text-sm font-semibold text-text">
            Motivo da correção (mín. 3 letras)
            <input className="field-input mt-xs font-normal" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
          </label>
          <div className="mt-md flex gap-sm">
            <Button type="button" variant="primary" disabled={loading || editReason.trim().length < 3} onClick={() => void handleCorrect()}>
              Salvar correção
            </Button>
            <Button type="button" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {feedback ? <Alert tone="error" message={feedback} /> : null}

      <div className="mt-md flex gap-lg border-b border-border" role="tablist" aria-label="Seções da família">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-xs py-sm font-sans text-sm font-semibold transition-colors ${
              tab === item.id
                ? "border-primary text-primary-action"
                : "border-transparent text-text-muted hover:text-text-strong"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-md flex flex-col gap-md">
          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-sm font-display text-lg font-semibold text-text-strong">
                <span className="material-symbols-outlined text-[20px] text-text-muted" aria-hidden="true">
                  groups
                </span>
                Composição familiar resumida
              </h2>
              <button
                type="button"
                onClick={() => setTab("members")}
                className="inline-flex items-center gap-xs font-sans text-sm font-semibold text-primary-action hover:underline"
              >
                Gerenciar membros na aba Membros
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
            <table className="mt-md w-full font-sans text-sm text-text">
              <thead>
                <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
                  <th className="px-md py-sm font-bold text-secondary-dark">Nome do membro</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Parentesco / Papel</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Idade</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Contato / Vinculação ativa</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => (
                  <tr key={member.membershipId} className="border-b border-border">
                    <td className="px-md py-sm font-semibold text-text-strong">
                      <Link to={`/persons/${member.personId}`} className="hover:text-primary-action hover:underline">
                        {member.personName}
                      </Link>
                    </td>
                    <td className="px-md py-sm">
                      {member.relationshipToReference ?? "—"}
                      {member.isReference ? " / Pessoa de referência" : ""}
                    </td>
                    <td className="px-md py-sm">{ageOf(personInfo[member.personId]?.birthDate ?? null)}</td>
                    <td className="px-md py-sm">
                      Contato: {personInfo[member.personId]?.contactPhone ?? family.contactPhone ?? "—"}
                    </td>
                  </tr>
                ))}
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-md text-center font-sans text-sm text-text-muted">
                      Sem membros com vínculo vigente.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <h2 className="flex items-center gap-sm font-display text-lg font-semibold text-text-strong">
              <span className="material-symbols-outlined text-[20px] text-text-muted" aria-hidden="true">
                schedule
              </span>
              Última interação
            </h2>
            {latest ? (
              <div className="mt-sm font-sans text-sm text-text">
                <p>
                  <span className="font-mono text-xs">{formatDate(latest.date)}</span>
                  {" • "}
                  <span className="font-semibold">Tipo:</span> {latest.title}
                  {latest.detail ? ` — ${latest.detail}` : ""}
                </p>
                <div className="mt-sm flex gap-md">
                  {latest.deliveryId ? (
                    <Link to={`/deliveries/${latest.deliveryId}`} className="font-semibold text-primary-action hover:underline">
                      Ver atendimento
                    </Link>
                  ) : null}
                  {latest.serviceRecordId ? (
                    <button
                      type="button"
                      onClick={() => void (async () => setServiceDetail(await getServiceRecord(latest.serviceRecordId!)))()}
                      className="font-semibold text-primary-action hover:underline"
                    >
                      Ver atendimento
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-sm font-sans text-sm text-text-muted">Nenhum atendimento ou entrega registrado.</p>
            )}
          </section>

          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-sm font-display text-lg font-semibold text-text-strong">
                <span className="material-symbols-outlined text-[20px] text-text-muted" aria-hidden="true">
                  history
                </span>
                Linha do tempo recente
              </h2>
              <button
                type="button"
                onClick={() => setTab("history")}
                className="inline-flex items-center gap-xs font-sans text-sm font-semibold text-primary-action hover:underline"
              >
                Ver histórico completo
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
            {timeline.length === 0 ? (
              <p className="mt-sm font-sans text-sm text-text-muted">Sem eventos no histórico.</p>
            ) : (
              <ol className="mt-md flex flex-col gap-md border-l-2 border-secondary-border pl-md">
                {timeline.slice(0, 5).map((entry) => (
                  <li key={entry.key} className="flex flex-wrap items-center gap-sm font-sans text-sm text-text">
                    <span className="font-mono text-xs text-text-muted">{formatDate(entry.date)}</span>
                    <span className="font-semibold text-text-strong">{entry.title}</span>
                    <span className="text-text-muted">{entry.detail}</span>
                    <StatusTag tone={entry.tag.tone} icon={entry.tag.icon} label={entry.tag.label} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="mt-md flex flex-col gap-md">
          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-sm font-display text-lg font-semibold text-text-strong">
                <span className="material-symbols-outlined text-[20px] text-text-muted" aria-hidden="true">
                  group
                </span>
                Membros do núcleo familiar
              </h2>
              <Button type="button" onClick={() => setAddingMember((value) => !value)}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  add
                </span>
                Adicionar membro
              </Button>
            </div>
            <table className="mt-md w-full font-sans text-sm text-text">
              <thead>
                <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
                  <th className="px-md py-sm font-bold text-secondary-dark">Nome</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Parentesco</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Referência</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Início</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Situação</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => (
                  <tr key={member.membershipId} className="border-b border-border">
                    <td className="px-md py-sm">
                      <Link to={`/persons/${member.personId}`} className="font-semibold text-text-strong hover:text-primary-action hover:underline">
                        {member.personName}
                      </Link>
                      <p className="font-sans text-xs text-text-muted">{ageOf(personInfo[member.personId]?.birthDate ?? null)}</p>
                    </td>
                    <td className="px-md py-sm">{member.relationshipToReference ?? "—"}</td>
                    <td className="px-md py-sm">
                      {member.isReference ? (
                        <span className="inline-flex items-center gap-xs font-semibold text-text-strong">
                          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">
                            verified
                          </span>
                          Sim
                        </span>
                      ) : (
                        "Não"
                      )}
                    </td>
                    <td className="px-md py-sm font-mono text-xs">{formatDate(member.validFrom)}</td>
                    <td className="px-md py-sm">
                      <StatusTag tone="neutral" icon="circle" label="Ativo" />
                    </td>
                    <td className="px-md py-sm">
                      <button
                        type="button"
                        onClick={() => setClosureTarget(member.membershipId)}
                        className="font-sans text-sm font-semibold text-aptIneligibleText hover:underline"
                      >
                        Encerrar
                      </button>
                    </td>
                  </tr>
                ))}
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-md text-center font-sans text-sm text-text-muted">
                      Sem membros com vínculo vigente.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {addingMember ? (
              <div className="mt-md rounded-lg border border-border bg-background p-md">
                <div className="flex gap-sm">
                  <input
                    className="field-input font-normal"
                    placeholder="Buscar pessoa por nome/CPF"
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSearchPerson();
                    }}
                  />
                  <Button type="button" onClick={() => void handleSearchPerson()}>
                    Buscar
                  </Button>
                </div>
                {addResults.length > 0 ? (
                  <select
                    className="field-input mt-sm font-normal"
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {addResults.map((person) => (
                      <option key={person.personId} value={person.personId}>
                        {person.name} — família atual: {person.currentFamilyCode ?? "—"}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="mt-sm flex flex-wrap items-end gap-sm">
                  <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
                    Início
                    <input type="date" className="field-input w-auto font-normal" value={validFrom} max={today()} onChange={(e) => setValidFrom(e.target.value)} />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-xs font-sans text-sm font-semibold text-text">
                    Parentesco com titular
                    <input className="field-input font-normal" placeholder="Ex: Filho(a)" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
                  </label>
                  <label className="flex items-center gap-sm font-sans text-sm font-semibold text-text">
                    <input type="checkbox" checked={isReference} onChange={(e) => setIsReference(e.target.checked)} />
                    Titular
                  </label>
                  <Button type="button" variant="primary" disabled={loading || !selectedPersonId} onClick={() => void handleAddMember()}>
                    Adicionar
                  </Button>
                </div>
                <Link to={`/persons/new?familyId=${family.familyId}`} className="mt-sm inline-block font-sans text-sm font-semibold text-primary-action hover:underline">
                  + Cadastrar nova pessoa nesta família
                </Link>
              </div>
            ) : null}

            {closedMembers.length > 0 ? (
              <details className="mt-md rounded-lg border border-border">
                <summary className="cursor-pointer px-md py-sm font-sans text-sm font-semibold text-text-strong">
                  Histórico de vínculos ({closedMembers.length})
                </summary>
                <table className="w-full font-sans text-sm text-text">
                  <thead>
                    <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
                      <th className="px-md py-sm font-bold text-secondary-dark">Nome</th>
                      <th className="px-md py-sm font-bold text-secondary-dark">Parentesco</th>
                      <th className="px-md py-sm font-bold text-secondary-dark">Início</th>
                      <th className="px-md py-sm font-bold text-secondary-dark">Término</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedMembers.map((member) => (
                      <tr key={member.membershipId} className="border-b border-border">
                        <td className="px-md py-sm">{member.personName}</td>
                        <td className="px-md py-sm">{member.relationshipToReference ?? "—"}</td>
                        <td className="px-md py-sm font-mono text-xs">{formatDate(member.validFrom)}</td>
                        <td className="px-md py-sm font-mono text-xs">
                          {member.validUntil ? formatDate(member.validUntil) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-md flex flex-col gap-md">
          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-text-strong">Entregas</h2>
            <table className="mt-md w-full font-sans text-sm text-text">
              <thead>
                <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
                  <th className="px-md py-sm font-bold text-secondary-dark">Data</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Status</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Ações</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.deliveryId} className="border-b border-border">
                    <td className="px-md py-sm font-mono text-xs">{formatDate(delivery.occurredAt)}</td>
                    <td className="px-md py-sm">
                      {delivery.status === "COMPLETED" ? (
                        <StatusTag tone="neutral" icon="check_circle" label="Concluída" />
                      ) : (
                        <StatusTag tone="pending" icon="history" label="Estornada" />
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <Link to={`/deliveries/${delivery.deliveryId}`} className="font-semibold text-primary-action hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-md text-center font-sans text-sm text-text-muted">
                      Nenhuma entrega registrada
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl bg-surface p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-text-strong">Atendimentos</h2>
            <table className="mt-md w-full font-sans text-sm text-text">
              <thead>
                <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
                  <th className="px-md py-sm font-bold text-secondary-dark">Data</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Tipo</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Executor</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Status</th>
                  <th className="px-md py-sm font-bold text-secondary-dark">Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.map((record) => (
                  <tr key={record.serviceRecordId} className="border-b border-border">
                    <td className="px-md py-sm font-mono text-xs">{formatDate(record.occurredAt)}</td>
                    <td className="px-md py-sm">{record.serviceTypeName}</td>
                    <td className="px-md py-sm">{record.executorName}</td>
                    <td className="px-md py-sm">
                      {record.status === "COMPLETED" ? (
                        <StatusTag tone="neutral" icon="check_circle" label="Concluído" />
                      ) : (
                        <StatusTag tone="pending" icon="cancel" label="Cancelado" />
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <button
                        type="button"
                        onClick={() => void (async () => setServiceDetail(await getServiceRecord(record.serviceRecordId)))()}
                        className="font-semibold text-primary-action hover:underline"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-md text-center font-sans text-sm text-text-muted">
                      Nenhum atendimento registrado
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === "social" ? (
        <div className="mt-md rounded-xl bg-surface p-6 shadow-sm">
          <EmptyState
            icon="folder_shared"
            title="Ficha social"
            hint="Módulo da frente FRQ — fora do escopo deste protótipo (AD)."
          />
        </div>
      ) : null}

      <Drawer
        open={serviceDetail !== null}
        title={serviceDetail ? `Atendimento ${formatDate(serviceDetail.occurredAt)}` : "Atendimento"}
        onClose={() => setServiceDetail(null)}
      >
        {serviceDetail ? (
          <dl className="grid gap-sm font-sans text-sm text-text">
            <div>
              <dt className="font-semibold text-text-strong">Tipo</dt>
              <dd>{serviceDetail.serviceTypeName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-strong">Executor</dt>
              <dd>
                {serviceDetail.executorName} ({serviceDetail.executorRole})
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text-strong">Observação</dt>
              <dd>{serviceDetail.note ?? "—"}</dd>
            </div>
            {serviceDetail.hasHomeVisit ? (
              <div>
                <dt className="font-semibold text-text-strong">Visita domiciliar</dt>
                <dd>{serviceDetail.homeVisit?.observedSituation ?? "—"}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Drawer>

      <ConfirmModal
        open={closureTarget !== null}
        title="Encerrar vínculo"
        fields={[
          { label: "Data de encerramento", name: "validUntil", required: true, type: "text", defaultValue: today() },
          { label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "textarea" },
        ]}
        confirmLabel="Confirmar"
        danger
        onCancel={() => setClosureTarget(null)}
        onConfirm={(values) => void handleClosure(values)}
      />
    </div>
  );
}
