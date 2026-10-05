import { useEffect, useState } from "react";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getFamily, searchFamilies } from "../../../registration/presentation/api/families.api.js";
import { searchPersons } from "../../../registration/presentation/api/persons.api.js";
import {
    cancelServiceRecord,
    correctServiceRecordNote,
    getServiceRecord,
    listActivities,
    listServiceRecords,
    registerServiceRecord,
    type ServiceRecordItem,
} from "../api/service-records.api";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [familyId, setFamilyId] = useState("");
  const [familyLabel, setFamilyLabel] = useState<string | undefined>(undefined);
  const [activities, setActivities] = useState<{ activityId: string; name: string; serviceTypeName: string }[]>([]);
  const [activityId, setActivityId] = useState("");
  const [personId, setPersonId] = useState("");
  const [personLabel, setPersonLabel] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [occurredAt, setOccurredAt] = useState(today());
  const [executorName, setExecutorName] = useState("");
  const [executorRole, setExecutorRole] = useState("");
  const [note, setNote] = useState("");
  const [isHomeVisit, setIsHomeVisit] = useState(false);
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

  async function handleSearch(): Promise<void> {
    if (!familyId) {
      setFeedback("Selecione a família.");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      setRecords(await listServiceRecords(familyId, { from: from || undefined, to: to || undefined }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!familyId || !activityId) {
      setFeedback("Selecione a família e a atividade.");
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
        homeVisit: isHomeVisit ? { observedSituation: observedSituation.trim() } : null,
        note: note.trim() === "" ? null : note,
        occurredAt,
        personId: personId || null,
      });
      setFeedback(`Atendimento registrado: ${created.serviceRecordId}`);
      setRecords(await listServiceRecords(familyId));
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
      if (familyId) setRecords(await listServiceRecords(familyId));
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
      if (familyId) setRecords(await listServiceRecords(familyId));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Atendimentos pontuais</h2>

      <form onSubmit={handleSubmit} className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="mb-2 font-semibold">Registrar atendimento</h3>
        <div className="grid gap-2">
          <SearchSelect
            label="Família"
            placeholder="Digite ao menos 2 letras do nome ou código..."
            selectedLabel={familyLabel}
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
          <label className="block text-sm">
            Atividade
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              required
            >
              {activities.map((option) => (
                <option key={option.activityId} value={option.activityId}>
                  {option.name} ({option.serviceTypeName})
                </option>
              ))}
            </select>
          </label>
          <SearchSelect
            label="Pessoa atendida (opcional — vazio = família)"
            placeholder="Digite ao menos 2 letras..."
            selectedLabel={personLabel}
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
          <label className="block text-sm">
            Data do fato
            <input
              type="date"
              className="mt-1 w-full rounded border px-2 py-1"
              value={occurredAt}
              max={today()}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Nome do executor
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={executorName}
              minLength={2}
              onChange={(e) => setExecutorName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Função do executor
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={executorRole}
              minLength={2}
              onChange={(e) => setExecutorRole(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Observação (opcional, máx 500)
            <textarea
              className="mt-1 w-full rounded border px-2 py-1"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={isHomeVisit}
              onChange={(e) => setIsHomeVisit(e.target.checked)}
            />{" "}
            Visita domiciliar
          </label>
          {isHomeVisit ? (
            <label className="block text-sm">
              Situação encontrada
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={observedSituation}
                onChange={(e) => setObservedSituation(e.target.value)}
                required
              />
            </label>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 rounded bg-gray-800 px-4 py-2 text-white"
        >
          {loading ? "Registrando..." : "Registrar atendimento"}
        </button>
      </form>

      {feedback ? <p className="mt-3 text-sm">{feedback}</p> : null}

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h3 className="mb-2 font-semibold">Atendimentos da família</h3>
        <div className="flex flex-wrap gap-2">
          <input type="date" className="rounded border px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded border px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            type="button"
            disabled={loading}
            onClick={handleSearch}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Buscar
          </button>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-2">Data</th>
              <th className="pr-2">Tipo</th>
              <th className="pr-2">Executor</th>
              <th className="pr-2">Status</th>
              <th className="pr-2">Visita</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.serviceRecordId} className="border-t">
                <td className="pr-2">{record.occurredAt}</td>
                <td className="pr-2">{record.serviceTypeName}</td>
                <td className="pr-2">
                  {record.executorName} ({record.executorRole})
                </td>
                <td className="pr-2">{record.status}</td>
                <td className="pr-2" title={record.homeVisit?.observedSituation ?? ""}>
                  {record.hasHomeVisit ? "🏠" : "—"}
                </td>
                <td className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void (async () => { setDetail(await getServiceRecord(record.serviceRecordId)); })()}
                    className="text-blue-700 underline"
                  >
                    Ver
                  </button>
                  {record.status === "COMPLETED" ? (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(record)}
                      className="rounded bg-red-100 px-2 py-1 text-red-800"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Atendimento {detail.occurredAt}</h3>
            <dl className="grid gap-1 text-sm">
              <div><dt className="font-bold">Tipo</dt><dd>{detail.serviceTypeName}</dd></div>
              <div><dt className="font-bold">Executor</dt><dd>{detail.executorName} ({detail.executorRole})</dd></div>
              <div><dt className="font-bold">Observação</dt><dd>{detail.note ?? "—"}</dd></div>
              {detail.hasHomeVisit ? <div><dt className="font-bold">Visita domiciliar</dt><dd>{detail.homeVisit?.observedSituation ?? "—"}</dd></div> : null}
            </dl>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setNoteTarget(detail)} className="rounded bg-gray-200 px-4 py-2 text-sm">
                Corrigir nota
              </button>
              <button type="button" onClick={() => setDetail(null)} className="rounded bg-gray-200 px-4 py-2 text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
