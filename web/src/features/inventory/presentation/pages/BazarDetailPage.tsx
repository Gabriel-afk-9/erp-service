import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBazarTransfer, type BazarTransferDetail } from "../api/inventory.api.js";

export function BazarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<BazarTransferDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      try {
        setDetail(await getBazarTransfer(id));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    }
    void load();
  }, [id]);

  if (!detail) return <p className="text-sm text-aptIneligibleText">{feedback ?? "Carregando..."}</p>;

  return (
    <div>
      <Link to="/inventory/bazar" className="text-sm text-primary-action underline">← Bazar</Link>
      <h2 className="mt-2 text-xl font-bold">Transferência {detail.externalReference}</h2>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-bold">Doador</dt><dd>{detail.donorName ?? "—"}</dd></div>
          <div><dt className="font-bold">Recebida em</dt><dd>{detail.receivedAt}</dd></div>
        </dl>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <h3 className="font-bold">Linhas</h3>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Item</th><th className="pr-2">Informada</th><th className="pr-2">Recebida</th><th className="pr-2">Aceita</th><th className="pr-2">Descartada</th><th>Divergência</th></tr></thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.lineId} className="border-t">
                <td className="pr-2">{line.itemName}</td>
                <td className="pr-2">{line.informedQuantity ?? "—"}</td>
                <td className="pr-2">{line.receivedQuantity}</td>
                <td className="pr-2">{line.acceptedQuantity}</td>
                <td className="pr-2">{line.rejectedQuantity}</td>
                <td>{line.divergence !== null && line.divergence !== 0 ? <span className="text-aptPendingText">⚠️ {line.divergence > 0 ? `+${line.divergence}` : line.divergence}</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
