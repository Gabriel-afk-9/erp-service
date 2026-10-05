import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getFamily, searchFamilies } from "../../../registration/presentation/api/families.api.js";
import { listDeliveries, reverseDelivery, type DeliveryListItem } from "../api/deliveries.api.js";

export function DeliveriesPage() {
  const [familyId, setFamilyId] = useState("");
  const [familyLabel, setFamilyLabel] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [familyNames, setFamilyNames] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<DeliveryListItem | null>(null);

  async function load(currentFamilyId?: string): Promise<void> {
    setLoading(true);
    try {
      const result = await listDeliveries(currentFamilyId || undefined);
      setItems(result.deliveries);
      const missing = [...new Set(result.deliveries.map((item) => item.familyId))].filter((id) => familyNames[id] === undefined);
      if (missing.length > 0) {
        const names: Record<string, string> = {};
        await Promise.all(
          missing.map(async (id) => {
            try {
              const family = await getFamily(id);
              names[id] = `${family.referenceName ?? "Sem nome"} (${family.code})`;
            } catch {
              names[id] = id;
            }
          }),
        );
        setFamilyNames((previous) => ({ ...previous, ...names }));
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleReverse(values: Record<string, string>): Promise<void> {
    if (!reverseTarget) return;
    setLoading(true);
    try {
      await reverseDelivery(reverseTarget.deliveryId, values.reason ?? "");
      setReverseTarget(null);
      await load(familyId || undefined);
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
        <div className="w-full">
          <SearchSelect
            label=""
            placeholder="Filtrar por família (opcional)"
            selectedLabel={familyLabel}
            onSearch={async (query) => {
              const result = await searchFamilies({ q: query });
              return result.items.map((item) => ({ id: item.familyId, label: item.referenceName ?? "Sem nome", sublabel: item.code }));
            }}
            onSelect={(id) => {
              setFamilyId(id);
              void (async () => {
                try {
                  const family = await getFamily(id);
                  setFamilyLabel(`${family.referenceName ?? "Sem nome"} (${family.code})`);
                } catch {
                  setFamilyLabel(id);
                }
                await load(id);
              })();
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => { setFamilyId(""); setFamilyLabel(undefined); void load(); }}
          className="rounded bg-gray-200 px-4 py-2"
          disabled={loading}
        >
          Limpar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Família</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.deliveryId} className="border-t">
                <td className="pr-2">{item.occurredAt.slice(0, 10)}</td>
                <td className="pr-2">{familyNames[item.familyId] ?? item.familyId}</td>
                <td className="pr-2">{item.status === "COMPLETED" ? "Concluída" : "Estornada"}</td>
                <td className="flex gap-2">
                  <Link to={`/deliveries/${item.deliveryId}`} className="text-blue-700 underline">Ver</Link>
                  {item.status === "COMPLETED" ? <button type="button" onClick={() => setReverseTarget(item)} className="text-red-700 underline">Estornar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhuma entrega encontrada</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={reverseTarget !== null}
        title="Estornar entrega"
        fields={[{ label: "Motivo do estorno (mín. 3 letras)", minLength: 3, name: "reason", required: true, type: "textarea" }]}
        confirmLabel="Estornar"
        danger
        onCancel={() => setReverseTarget(null)}
        onConfirm={(values) => void handleReverse(values)}
      />
    </div>
  );
}
