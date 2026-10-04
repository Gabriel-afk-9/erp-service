import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { get } from "../../../../shared/application/api-client";

interface DeliveryDetail {
  deliveryId: string;
  serviceRecordId: string;
  familyId: string;
  eligibilityStatus: string;
  occurredAt: string;
  collectedByPersonId: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason: string | null;
  authorizedBy: string | null;
  status: string;
  reversal: { reversalId: string; reason: string } | null;
  lines: { lineId: string; stockLotId: string; quantity: number }[];
}

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      try {
        const result = (await get(`/deliveries/${encodeURIComponent(id)}`)) as { data?: DeliveryDetail };
        if (!result.data || typeof result.data.deliveryId !== "string") throw new Error("Entrega não encontrada");
        setDetail(result.data);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    }
    void load();
  }, [id]);

  if (!detail) return <p className="text-sm text-red-700">{feedback ?? "Carregando..."}</p>;

  return (
    <div>
      <Link to="/deliveries" className="text-sm text-blue-700 underline">← Voltar para entregas</Link>
      <h2 className="mt-2 text-xl font-bold">Entrega {detail.occurredAt.slice(0, 10)}</h2>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-bold">Status</dt><dd>{detail.status === "COMPLETED" ? "Concluída" : "Estornada"}</dd></div>
          <div><dt className="font-bold">Aptidão</dt><dd>{detail.eligibilityStatus}</dd></div>
          <div><dt className="font-bold">Executor</dt><dd>{detail.executorName} — {detail.executorRole}</dd></div>
          <div><dt className="font-bold">Justificativa</dt><dd>{detail.exceptionReason ?? "—"}</dd></div>
          <div><dt className="font-bold">Autorizado por</dt><dd>{detail.authorizedBy ?? "—"}</dd></div>
          <div><dt className="font-bold">Atendimento</dt><dd className="font-mono text-xs">{detail.serviceRecordId}</dd></div>
          {detail.reversal ? <div><dt className="font-bold">Estorno</dt><dd>{detail.reversal.reason}</dd></div> : null}
        </dl>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
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
