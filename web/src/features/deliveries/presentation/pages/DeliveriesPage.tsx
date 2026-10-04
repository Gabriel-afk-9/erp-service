import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDeliveries, reverseDelivery, type DeliveryListItem } from "../api/deliveries.api.js";

export function DeliveriesPage() {
  const [familyId, setFamilyId] = useState("");
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const result = await listDeliveries(familyId.trim() || undefined);
      setItems(result.deliveries);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleReverse(item: DeliveryListItem): Promise<void> {
    const reason = window.prompt("Motivo do estorno (mín. 3 letras):", "Lançamento em duplicidade");
    if (!reason || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await reverseDelivery(item.deliveryId, reason.trim());
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Entregas</h2>
        <Link to="/deliveries/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">
          + Nova entrega
        </Link>
      </div>
      <div className="mt-4 flex gap-2">
        <input className="w-full rounded border px-3 py-2" placeholder="Filtrar por ID da família (opcional)" value={familyId} onChange={(e) => setFamilyId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        <button type="button" onClick={() => void load()} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>Buscar</button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Família</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.deliveryId} className="border-t">
                <td className="pr-2">{item.occurredAt.slice(0, 10)}</td>
                <td className="pr-2 font-mono text-xs">{item.familyId.slice(0, 8)}</td>
                <td className="pr-2">{item.status === "COMPLETED" ? "Concluída" : "Estornada"}</td>
                <td className="flex gap-2">
                  <Link to={`/deliveries/${item.deliveryId}`} className="text-blue-700 underline">Ver</Link>
                  {item.status === "COMPLETED" ? <button type="button" onClick={() => void handleReverse(item)} className="text-red-700 underline">Estornar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhuma entrega encontrada</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
