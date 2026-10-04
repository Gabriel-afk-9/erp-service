import { useEffect, useState } from "react";
import { listBazarTransfers, registerBazarTransfer, type BazarTransferItem } from "../api/bazar.api.js";
import { listItems } from "../api/inventory.api.js";

function newOperationKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function BazarPage() {
  const [transfers, setTransfers] = useState<BazarTransferItem[]>([]);
  const [items, setItems] = useState<{ itemId: string; name: string }[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [itemId, setItemId] = useState("");
  const [informed, setInformed] = useState("10");
  const [received, setReceived] = useState("8");

  async function load(): Promise<void> {
    try {
      const [listed, stock] = await Promise.all([listBazarTransfers(), listItems({})]);
      setTransfers(listed.transfers);
      setItems(stock.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(): Promise<void> {
    if (!reference.trim() || !itemId || !receivedAt) {
      setFeedback("Preencha referência, item e data.");
      return;
    }
    setLoading(true);
    try {
      const result = await registerBazarTransfer({
        externalReference: reference.trim(),
        receivedAt,
        operationKey: newOperationKey(),
        lines: [{
          itemId,
          informedQuantity: Number(informed),
          receivedQuantity: Number(received),
          acceptedQuantity: Number(received),
          rejectedQuantity: 0,
        }],
      });
      setFeedback(result.duplicate ? "Referência já registrada (sem duplicar)." : "Transferência registrada.");
      setReference("");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Bazar — Transferências</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded bg-white p-4 shadow">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Referência do Bazar (ex: BAZ-2024-0001)" value={reference} onChange={(e) => setReference(e.target.value)} />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Selecione o item</option>
          {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Qtd. informada" value={informed} onChange={(e) => setInformed(e.target.value)} />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Qtd. recebida" value={received} onChange={(e) => setReceived(e.target.value)} />
        </div>
        <button type="button" onClick={() => void handleSubmit()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Registrar transferência</button>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Referência</th><th>Recebimento</th></tr></thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.transferId} className="border-t">
                <td className="pr-2">{transfer.externalReference}</td>
                <td className="font-mono text-xs">{transfer.receiptId.slice(0, 8)}</td>
              </tr>
            ))}
            {transfers.length === 0 ? <tr><td colSpan={2} className="py-4 text-center text-gray-500">Nenhuma transferência registrada</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
