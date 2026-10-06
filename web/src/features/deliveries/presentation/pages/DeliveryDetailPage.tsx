import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFamily } from "../../../registration/presentation/api/families.api.js";
import { getDelivery, type DeliveryDetail } from "../api/deliveries.api.js";

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      setLoading(true);
      try {
        const loaded = await getDelivery(id);
        setDetail(loaded);
        try {
          const family = await getFamily(loaded.familyId);
          setFamilyName(`${family.referenceName ?? "Sem nome"} (${family.code})`);
        } catch {
          setFamilyName(loaded.familyId);
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) return <p className="text-sm text-text-muted">Carregando...</p>;
  if (!detail) return <p className="text-sm text-aptIneligibleText">{feedback ?? "Entrega não encontrada"}</p>;

  return (
    <div>
      <Link to="/deliveries" className="text-sm text-primary-action underline">← Voltar para entregas</Link>
      <h2 className="mt-2 text-xl font-bold">Entrega {detail.occurredAt.slice(0, 10)}</h2>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-bold">Família</dt><dd>{familyName ?? detail.familyId}</dd></div>
          <div><dt className="font-bold">Status</dt><dd>{detail.status === "COMPLETED" ? "Concluída" : "Estornada"}</dd></div>
          <div><dt className="font-bold">Aptidão</dt><dd>{detail.eligibilityStatus}</dd></div>
          <div><dt className="font-bold">Executor</dt><dd>{detail.executorName} — {detail.executorRole}</dd></div>
          <div><dt className="font-bold">Justificativa</dt><dd>{detail.exceptionReason ?? "—"}</dd></div>
          <div><dt className="font-bold">Autorizado por</dt><dd>{detail.authorizedBy ?? "—"}</dd></div>
          <div><dt className="font-bold">Atendimento</dt><dd className="font-mono text-xs">{detail.serviceRecordId}</dd></div>
          {detail.reversal ? <div><dt className="font-bold">Estorno</dt><dd>{detail.reversal.reason}</dd></div> : null}
        </dl>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <h3 className="font-bold">Itens</h3>
        <ul className="mt-2 grid gap-2 text-sm">
          {detail.lines.map((line) => (
            <li key={line.lineId} className="border-t pt-2">Lote {line.stockLotId.slice(0, 8)} — {line.quantity}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
