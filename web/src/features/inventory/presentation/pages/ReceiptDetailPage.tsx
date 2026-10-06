import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReceipt, type ReceiptDetail } from "../api/inventory.api.js";

export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      try {
        setDetail(await getReceipt(id));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    }
    void load();
  }, [id]);

  if (!detail) return <p className="text-sm text-aptIneligibleText">{feedback ?? "Carregando..."}</p>;

  return (
    <div>
      <Link to="/inventory/receipts" className="text-sm text-primary-action underline">← Recebimentos</Link>
      <h2 className="mt-2 text-xl font-bold">Recebimento {detail.receivedAt}</h2>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-bold">Origem</dt><dd>{detail.originType}</dd></div>
          <div><dt className="font-bold">Doador</dt><dd>{detail.donorName ?? "—"}</dd></div>
          <div><dt className="font-bold">Recebido por</dt><dd>{detail.receivedBy}</dd></div>
          <div><dt className="font-bold">Nota</dt><dd>{detail.note ?? "—"}</dd></div>
        </dl>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <h3 className="font-bold">Linhas</h3>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Item</th><th className="pr-2">Informada</th><th className="pr-2">Recebida</th><th className="pr-2">Aceita</th><th className="pr-2">Descartada</th><th>Motivo</th></tr></thead>
          <tbody>
            {detail.lines.map((line) => {
              const divergence = line.informedQuantity !== null ? line.receivedQuantity - line.informedQuantity : null;
              return (
                <tr key={line.lineId} className="border-t">
                  <td className="pr-2">{line.itemName} ({line.unitSymbol})</td>
                  <td className="pr-2">{line.informedQuantity ?? "—"}</td>
                  <td className="pr-2">
                    {line.receivedQuantity}
                    {divergence !== null && divergence !== 0 ? <span className="ml-1 text-aptPendingText">⚠️ {divergence > 0 ? `+${divergence}` : divergence}</span> : null}
                  </td>
                  <td className="pr-2">{line.acceptedQuantity}</td>
                  <td className="pr-2">{line.rejectedQuantity}</td>
                  <td>{line.rejectionReason ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
