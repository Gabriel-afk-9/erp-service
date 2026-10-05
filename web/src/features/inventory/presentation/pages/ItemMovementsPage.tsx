import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getItem, getItemMovements, type ItemMovementRow } from "../api/inventory.api.js";

const MOVEMENT_LABELS: Record<string, string> = {
  ADJUSTMENT_IN: "Ajuste de entrada",
  ADJUSTMENT_OUT: "Ajuste de saída",
  BAZAR_IN: "Entrada do Bazar",
  DELIVERY_OUT: "Saída por entrega",
  DELIVERY_REVERSAL: "Estorno de entrega",
  DONATION_IN: "Entrada de doação",
  OPENING_BALANCE: "Saldo inicial",
  TRIAGE_DISCARD: "Descarte na triagem",
};

export function ItemMovementsPage() {
  const { id } = useParams<{ id: string }>();
  const [itemName, setItemName] = useState("");
  const [movements, setMovements] = useState<ItemMovementRow[]>([]);
  const [to, setTo] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(cutoff?: string): Promise<void> {
    if (!id) return;
    setLoading(true);
    try {
      const [item, result] = await Promise.all([getItem(id), getItemMovements(id, cutoff || undefined)]);
      setItemName(item.name);
      setMovements(result.movements);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  return (
    <div>
      <Link to="/inventory/balance" className="text-sm text-blue-700 underline">← Voltar ao saldo</Link>
      <h2 className="mt-2 text-xl font-bold">Movimentos — {itemName || "..."}</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 flex gap-2 rounded bg-white p-4 shadow">
        <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={() => void load(to || undefined)} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>Filtrar até</button>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Tipo</th><th className="pr-2">Qtd.</th><th className="pr-2">Delta</th><th>Saldo</th></tr></thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.movementId} className="border-t">
                <td className="pr-2">{movement.occurredAt}</td>
                <td className="pr-2">{MOVEMENT_LABELS[movement.type] ?? movement.type}</td>
                <td className="pr-2">{movement.quantity}</td>
                <td className="pr-2">{movement.balanceDelta}</td>
                <td>{movement.balanceAfter}</td>
              </tr>
            ))}
            {movements.length === 0 && !loading ? <tr><td colSpan={5} className="py-4 text-center text-gray-500">Sem movimentos</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
