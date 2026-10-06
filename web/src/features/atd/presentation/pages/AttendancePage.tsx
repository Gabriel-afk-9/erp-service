import { useEffect, useState } from "react";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { Drawer } from "../../../../shared/presentation/components/Drawer.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
import { StatusTag } from "../../../../shared/presentation/components/StatusTag.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getFamily, searchFamilies } from "../../../registration/presentation/api/families.api.js";
import { searchPersons } from "../../../registration/presentation/api/persons.api.js";
import {
    cancelServiceRecord,
    correctServiceRecordNote,
    formatActivityLabel,
    getServiceRecord,
    listActivities,
    listServiceRecords,
    registerServiceRecord,
    type ActivityOption,
    type ServiceRecordItem,
} from "../api/service-records.api";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [familyId, setFamilyId] = useState("");
  const [familyLabel, setFamilyLabel] = useState<string | undefined>(undefined);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [activityId, setActivityId] = useState("");
  const [personId, setPersonId] = useState("");
  const [personLabel, setPersonLabel] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [occurredAt, setOccurredAt] = useState(today());
  const [executorName, setExecutorName] = useState("");
  const [executorRole, setExecutorRole] = useState("");
  const [note, setNote] = useState("");
  const [observedSituation, setObservedSituation] = useState("");
  const [records, setRecords] = useState<ServiceRecordItem[]>([]);
  const [detail, setDetail] = useState<ServiceRecordItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ServiceRecordItem | null>(null);
  const [noteTarget, setNoteTarget] = useState<ServiceRecordItem | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await listActivities();
        setActivities(loaded);
        if (loaded.length > 0) setActivityId(loaded[0]!.activityId);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    })();
  }, []);

  async function loadRecords(id: string): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      setRecords(await listServiceRecords(id, { from: from || undefined, to: to || undefined }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  // Reload the family timeline whenever the selected family changes, so the
  // list below always reflects the family currently in the form.
  useEffect(() => {
    if (!familyId) {
      setRecords([]);
      setDetail(null);
      setCancelTarget(null);
      setNoteTarget(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFeedback(null);
    listServiceRecords(familyId, { from: from || undefined, to: to || undefined })
      .then((loaded) => {
        if (!cancelled) setRecords(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  async function handleSearch(): Promise<void> {
    if (!familyId) {
      setFeedback("Selecione a família.");
      return;
    }
    await loadRecords(familyId);
  }

  // The visit detail is derived from the selected activity type (SPEC-ATD section 3):
  // HOME_VISIT requires it, every other type forbids it. No checkbox needed.
  const selectedActivity = activities.find((activity) => activity.activityId === activityId);
  const isHomeVisitActivity = selectedActivity?.serviceTypeCode === "HOME_VISIT";

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!familyId || !activityId) {
      setFeedback("Selecione a família e a atividade.");
      return;
    }
    if (isHomeVisitActivity && observedSituation.trim() === "") {
      setFeedback("Informe a situação encontrada para a visita domiciliar.");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const created = await registerServiceRecord({
        activityId,
        executorName: executorName.trim(),
        executorRole: executorRole.trim(),
        familyId,
        homeVisit: isHomeVisitActivity ? { observedSituation: observedSituation.trim() } : null,
        note: note.trim() === "" ? null : note,
        occurredAt,
        personId: personId || null,
      });
      setFeedback(`Atendimento registrado: ${created.serviceRecordId}`);
      setObservedSituation("");
      await loadRecords(familyId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCancel(values: Record<string, string>): Promise<void> {
    if (!cancelTarget) return;
    setLoading(true);
    try {
      await cancelServiceRecord(cancelTarget.serviceRecordId, values.reason ?? "", cancelTarget.revision);
      setCancelTarget(null);
      setFeedback("Atendimento cancelado");
      if (familyId) await loadRecords(familyId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleCorrectNote(values: Record<string, string>): Promise<void> {
    if (!noteTarget) return;
    setLoading(true);
    try {
      await correctServiceRecordNote(noteTarget.serviceRecordId, {
        expectedRevision: noteTarget.revision,
        newNote: values.newNote ?? "",
        reason: values.reason ?? "",
      });
      setNoteTarget(null);
      setDetail(await getServiceRecord(noteTarget.serviceRecordId));
      if (familyId) await loadRecords(familyId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Atendimentos pontuais" />

      {feedback ? <Alert tone="info" message={feedback} /> : null}

      <div className="mt-md grid grid-cols-1 items-start gap-md xl:grid-cols-12">
      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-lg xl:col-span-5">
        <h3 className="font-display text-lg font-semibold text-text-strong">Registrar atendimento</h3>
        <div className="mt-sm grid gap-md">
          <SearchSelect
            label="Família"
            placeholder="Digite ao menos 2 letras do nome ou código..."
            selectedLabel={familyLabel}
            onClear={() => {
              setFamilyId("");
              setFamilyLabel(undefined);
              setPersonId("");
              setPersonLabel(undefined);
            }}
            onSearch={async (query) => {
              const result = await searchFamilies({ q: query });
              return result.items.map((item) => ({ id: item.familyId, label: item.referenceName ?? "Sem nome", sublabel: item.code }));
            }}
            onSelect={(id) => {
              setFamilyId(id);
              setPersonId("");
              setPersonLabel(undefined);
              void (async () => {
                try {
                  const family = await getFamily(id);
                  setFamilyLabel(`${family.referenceName ?? "Sem nome"} (${family.code})`);
                } catch {
                  setFamilyLabel(id);
                }
              })();
            }}
          />
          <label className="block font-sans text-sm font-semibold text-text">
            Atividade
            <select
              className="field-input mt-xs font-normal"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              required
            >
              {activities.map((option) => (
                <option key={option.activityId} value={option.activityId}>
                  {formatActivityLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <SearchSelect
            label="Pessoa atendida (opcional — vazio = família)"
            placeholder="Digite ao menos 2 letras..."
            selectedLabel={personLabel}
            onClear={() => {
              setPersonId("");
              setPersonLabel(undefined);
            }}
            onSearch={async (query) => {
              const result = await searchPersons({ familyId: familyId || undefined, q: query });
              return result.items.map((item) => ({ id: item.personId, label: item.name }));
            }}
            onSelect={(id) => {
              setPersonId(id);
              void (async () => {
                try {
                  const result = await searchPersons({ q: "" });
                  const found = result.items.find((item) => item.personId === id);
                  setPersonLabel(found?.name ?? id);
                } catch {
                  setPersonLabel(id);
                }
              })();
            }}
          />
          <label className="block font-sans text-sm font-semibold text-text">
            Data do fato
            <input
              type="date"
              className="field-input mt-xs font-normal"
              value={occurredAt}
              max={today()}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </label>
          <label className="block font-sans text-sm font-semibold text-text">
            Nome do executor
            <input
              className="field-input mt-xs font-normal"
              value={executorName}
              minLength={2}
              onChange={(e) => setExecutorName(e.target.value)}
              required
            />
          </label>
          <label className="block font-sans text-sm font-semibold text-text">
            Função do executor
            <input
              className="field-input mt-xs font-normal"
              value={executorRole}
              minLength={2}
              onChange={(e) => setExecutorRole(e.target.value)}
              required
            />
          </label>
          <label className="block font-sans text-sm font-semibold text-text">
            Observação (opcional, máx 500)
            <textarea
              className="field-input mt-xs h-auto min-h-[88px] py-sm font-normal"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {isHomeVisitActivity ? (
            <label className="block font-sans text-sm font-semibold text-text">
              Situação encontrada <span aria-hidden="true" className="text-coral">*</span>
              <input
                className="field-input mt-xs font-normal"
                value={observedSituation}
                onChange={(e) => setObservedSituation(e.target.value)}
                required
              />
              <span className="mt-xs block font-sans text-xs font-normal text-text-muted">
                Obrigatória para visita domiciliar
              </span>
            </label>
          ) : null}
        </div>
        <div className="mt-md">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Registrando..." : "Registrar atendimento"}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border bg-surface p-lg xl:col-span-7">
        <h3 className="font-display text-lg font-semibold text-text-strong">Atendimentos da família</h3>
        <div className="mt-sm flex flex-wrap items-end gap-sm">
          <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
            De
            <input type="date" className="field-input w-auto font-normal" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
            Até
            <input type="date" className="field-input w-auto font-normal" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button
            type="button"
            disabled={loading}
            onClick={handleSearch}
          >
            Buscar
          </Button>
        </div>
        <div className="mt-md overflow-x-auto">
        <table className="w-full min-w-[720px] font-sans text-sm text-text">
          <thead>
            <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
              <th className="px-md py-sm font-bold text-secondary-dark">Data</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Tipo</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Nome do executor</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Função do executor</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Status</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Visita</th>
              <th className="px-md py-sm font-bold text-secondary-dark">Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.serviceRecordId} className="border-b border-border">
                <td className="px-md py-sm font-mono text-xs">{record.occurredAt}</td>
                <td className="px-md py-sm">{record.serviceTypeName}</td>
                <td className="px-md py-sm">{record.executorName}</td>
                <td className="px-md py-sm">{record.executorRole}</td>
                <td className="px-md py-sm">{record.status === "COMPLETED" ? <StatusTag tone="neutral" icon="check_circle" label="Concluído" /> : <StatusTag tone="pending" icon="cancel" label="Cancelado" />}</td>
                <td className="px-md py-sm" title={record.homeVisit?.observedSituation ?? ""}>
                  {record.hasHomeVisit ? <StatusTag tone="info" icon="home" label="Visita" /> : "—"}
                </td>
                <td className="px-md py-sm">
                  <div className="flex gap-sm">
                    <button
                      type="button"
                      onClick={() => void (async () => { setDetail(await getServiceRecord(record.serviceRecordId)); })()}
                      className="font-sans text-sm font-semibold text-primary-action underline"
                    >
                      Ver
                    </button>
                    {record.status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(record)}
                        className="font-sans text-sm font-semibold text-aptIneligibleText underline"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </div>

      <Drawer open={detail !== null} title={detail ? `Atendimento ${detail.occurredAt}` : "Atendimento"} onClose={() => setDetail(null)}>
        {detail ? (
          <div>
            <dl className="grid gap-sm font-sans text-sm text-text">
              <div><dt className="font-semibold text-text-strong">Tipo</dt><dd>{detail.serviceTypeName}</dd></div>
              <div><dt className="font-semibold text-text-strong">Executor</dt><dd>{detail.executorName} ({detail.executorRole})</dd></div>
              <div><dt className="font-semibold text-text-strong">Observação</dt><dd>{detail.note ?? "—"}</dd></div>
              {detail.status === "CANCELED" ? (
                <div>
                  <dt className="font-semibold text-text-strong">Motivo do cancelamento</dt>
                  <dd>{detail.cancelReason ?? "—"}</dd>
                </div>
              ) : null}
              {detail.hasHomeVisit ? <div><dt className="font-semibold text-text-strong">Visita domiciliar</dt><dd>{detail.homeVisit?.observedSituation ?? "—"}</dd></div> : null}
              <div><dt className="font-semibold text-text-strong">Histórico de alterações</dt><dd className="text-text-muted">Correções e cancelamentos preservam autor, data do fato, data do lançamento e motivo.</dd></div>
            </dl>
            <div className="mt-md flex gap-sm">
              <Button type="button" onClick={() => setNoteTarget(detail)}>
                Corrigir nota
              </Button>
              <Button type="button" onClick={() => setDetail(null)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmModal
        open={cancelTarget !== null}
        title="Cancelar atendimento"
        fields={[{ label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "text" }]}
        confirmLabel="Confirmar"
        danger
        onCancel={() => setCancelTarget(null)}
        onConfirm={(values) => void handleConfirmCancel(values)}
      />
      <ConfirmModal
        open={noteTarget !== null}
        title="Corrigir observação"
        fields={[
          { label: "Nova observação", name: "newNote", required: true, type: "textarea" },
          { label: "Motivo da correção (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "text" },
        ]}
        confirmLabel="Salvar correção"
        onCancel={() => setNoteTarget(null)}
        onConfirm={(values) => void handleCorrectNote(values)}
      />
    </div>
  );
}
