import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { listReceipts, type ReceiptListItem } from "../api/inventory.api.js";

const ORIGIN_TYPES = ["", "PERSON", "ORGANIZATION", "CAMPAIGN", "AD_HOC", "UNKNOWN"];
const ORIGIN_LABELS: Record<string, string> = {
  AD_HOC: "Avulso",
  CAMPAIGN: "Campanha",
  ORGANIZATION: "Organização",
  PERSON: "Pessoa",
  UNKNOWN: "Não identificado",
};

export function ReceiptsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [originType, setOriginType] = useState("");
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const result = await listReceipts({ from: from || undefined, originType: originType || undefined, to: to || undefined });
      setReceipts(result.receipts);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Recebimentos</h2>
        <Link to="/inventory/receipts/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">
          + Registrar recebimento
        </Link>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow">
        <input type="date" className="rounded border px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={originType} onChange={(e) => setOriginType(e.target.value)}>
          {ORIGIN_TYPES.map((type) => (
            <option key={type} value={type}>{type === "" ? "Todas as origens" : ORIGIN_LABELS[type]}</option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>Buscar</button>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <DataTable
          columns={[
            { key: "receivedAt", label: "Data" },
            { key: "originType", label: "Origem", render: (row) => ORIGIN_LABELS[(row as ReceiptListItem).originType] ?? (row as ReceiptListItem).originType },
            { key: "donorName", label: "Doador", render: (row) => (row as ReceiptListItem).donorName ?? "—" },
            { key: "receiptId", label: "Detalhe", render: (row) => <Link to={`/inventory/receipts/${(row as ReceiptListItem).receiptId}`} className="text-blue-700 underline">Ver</Link> },
          ]}
          rows={receipts}
          page={1}
          pageSize={Math.max(receipts.length, 1)}
          total={receipts.length}
          onPageChange={() => undefined}
          loading={loading}
          emptyMessage="Nenhum recebimento no período"
        />
      </div>
    </div>
  );
}
