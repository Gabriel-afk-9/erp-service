import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
import { StatusTag } from "../../../../shared/presentation/components/StatusTag.js";
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
      <PageHeader
        title="Entregas às famílias"
        actions={
          <Link to="/deliveries/new">
            <Button variant="primary">Nova entrega</Button>
          </Link>
        }
      />
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <div className="flex items-end gap-sm">
          <div className="min-w-0 flex-1">
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
        <Button
          type="button"
          onClick={() => { setFamilyId(""); setFamilyLabel(undefined); void load(); }}
          disabled={loading}
        >
          Limpar
        </Button>
        </div>
      </div>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <table className="w-full font-sans text-sm text-text">
          <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Data</th><th className="px-md py-sm font-bold text-secondary-dark">Família</th><th className="px-md py-sm font-bold text-secondary-dark">Status</th><th className="px-md py-sm font-bold text-secondary-dark">Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.deliveryId} className="border-b border-border">
                <td className="px-md py-sm font-mono text-xs">{item.occurredAt.slice(0, 10)}</td>
                <td className="px-md py-sm">{familyNames[item.familyId] ?? item.familyId}</td>
                <td className="px-md py-sm">{item.status === "COMPLETED" ? <StatusTag tone="neutral" icon="check_circle" label="Concluída" /> : <StatusTag tone="pending" icon="history" label="Estornada" />}</td>
                <td className="px-md py-sm">
                  <div className="flex gap-sm">
                    <Link to={`/deliveries/${item.deliveryId}`} className="font-sans text-sm font-semibold text-primary-action underline">Ver</Link>
                    {item.status === "COMPLETED" ? <button type="button" onClick={() => setReverseTarget(item)} className="font-sans text-sm font-semibold text-aptIneligibleText underline">Estornar</button> : null}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={4}><div className="py-md text-center font-sans text-sm text-text-muted">Nenhuma entrega encontrada</div></td></tr> : null}
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
