import { useState } from "react";
import {
    cancelServiceRecord,
    listServiceRecords,
    registerServiceRecord,
    type ServiceRecordItem,
} from "../api/service-records.api";

// TODO: replace with GET /families?query= once the endpoint exists (FASE 2 — CAD).
// For now the operator types the familyId directly (synthetic fixtures: fam-001..fam-005).
const DEFAULT_FAMILY_ID = "fam-001";

// TODO: replace with GET /service-types once the endpoint exists.
// Hardcoded from the synthetic activity fixtures.
const ACTIVITY_OPTIONS = [
  { activityId: "act-medical", label: "Atendimento médico" },
  { activityId: "act-visit", label: "Visita domiciliar" },
  { activityId: "act-donation", label: "Doação de itens" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [familyId, setFamilyId] = useState(DEFAULT_FAMILY_ID);
  const [activityId, setActivityId] = useState(ACTIVITY_OPTIONS[0].activityId);
  const [occurredAt, setOccurredAt] = useState(today());
  const [executorName, setExecutorName] = useState("");
  const [executorRole, setExecutorRole] = useState("");
  const [note, setNote] = useState("");
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [observedSituation, setObservedSituation] = useState("");
  const [records, setRecords] = useState<ServiceRecordItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ServiceRecordItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function handleSearch(): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      setRecords(await listServiceRecords(familyId.trim()));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const created = await registerServiceRecord({
        activityId,
        familyId: familyId.trim(),
        occurredAt,
        executorName: executorName.trim(),
        executorRole: executorRole.trim(),
        note: note.trim() === "" ? null : note,
        homeVisit: isHomeVisit ? { observedSituation: observedSituation.trim() } : null,
      });
      setFeedback(`Atendimento registrado: ${created.serviceRecordId}`);
      setRecords(await listServiceRecords(familyId.trim()));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCancel(): Promise<void> {
    if (!cancelTarget) return;
    setLoading(true);
    try {
      await cancelServiceRecord(cancelTarget.serviceRecordId, cancelReason.trim(), cancelTarget.revision);
      setCancelTarget(null);
      setCancelReason("");
      setFeedback("Atendimento cancelado");
      setRecords(await listServiceRecords(familyId.trim()));
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
          <label className="block text-sm">
            ID da Família
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Atividade
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.activityId} value={option.activityId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
        <button
          type="button"
          disabled={loading}
          onClick={handleSearch}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Buscar
        </button>
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
                <td>
                  {record.status === "COMPLETED" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(record);
                        setCancelReason("");
                      }}
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

      {cancelTarget ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Cancelar atendimento</h3>
            <label className="block text-sm">
              Motivo (mín 3 caracteres)
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={loading || cancelReason.trim().length < 3}
                onClick={handleConfirmCancel}
                className="rounded bg-red-700 px-4 py-2 text-white"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded bg-gray-200 px-4 py-2"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
