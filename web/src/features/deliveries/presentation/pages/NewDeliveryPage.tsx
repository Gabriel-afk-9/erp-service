import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getFamily, searchFamilies } from "../../../registration/presentation/api/families.api.js";
import { getItemBalance, listItems } from "../../../inventory/presentation/api/inventory.api.js";
import { confirmDelivery, previewDelivery } from "../api/deliveries.api.js";

interface LotRow {
  lotId: string;
  itemName: string;
  unitSymbol: string;
  onHand: number;
  quantity: string;
}

function newOperationKey(): string {
  return crypto.randomUUID();
}

export function NewDeliveryPage() {
  const navigate = useNavigate();
  const [familyId, setFamilyId] = useState("");
  const [familyLabel, setFamilyLabel] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eligibility, setEligibility] = useState<string | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [executorName, setExecutorName] = useState("");
  const [executorRole, setExecutorRole] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview(): Promise<void> {
    if (!familyId) {
      setFeedback("Selecione a família.");
      return;
    }
    setLoading(true);
    try {
      const preview = await previewDelivery(familyId, date);
      setEligibility(preview.eligibilityStatus);
      const stock = await listItems({});
      const balances = await Promise.all(stock.items.map(async (item) => ({ item, lots: (await getItemBalance(item.itemId)).lots })));
      const rows: LotRow[] = [];
      for (const { item, lots: itemLots } of balances) {
        for (const lot of itemLots) {
          if (lot.status !== "AVAILABLE" || lot.onHand <= 0) continue;
          rows.push({ lotId: lot.lotId, itemName: `${item.name}${lot.expiresOn ? ` (vale até ${lot.expiresOn.slice(0, 10)})` : ""}`, onHand: lot.onHand, quantity: "", unitSymbol: item.unitSymbol });
        }
      }
      setLots(rows);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    const lines = lots.filter((lot) => lot.quantity.trim() !== "").map((lot) => ({ lotId: lot.lotId, quantity: Number(lot.quantity) }));
    if (lines.length === 0) {
      setFeedback("Informe a quantidade de ao menos um lote.");
      return;
    }
    if (exceptionReason.trim().length < 3 || authorizedBy.trim() === "") {
      setFeedback("Justificativa (mín. 3 letras) e autorizador são obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      await confirmDelivery({
        authorizedBy: authorizedBy.trim(),
        exceptionReason: exceptionReason.trim(),
        executorName: executorName.trim(),
        executorRole: executorRole.trim(),
        familyId,
        lines,
        occurredAt: date,
        operationKey: newOperationKey(),
      });
      await navigate("/deliveries");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Nova entrega</h2>
      {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-md">
        <SearchSelect
          label="Família"
          placeholder="Digite ao menos 2 letras do nome ou código..."
          selectedLabel={familyLabel}
          onClear={() => {
            setFamilyId("");
            setFamilyLabel(undefined);
            setEligibility(null);
            setLots([]);
          }}
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
            })();
          }}
        />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" onClick={() => void handlePreview()} className="rounded bg-background border border-border px-4 py-2 text-sm" disabled={loading}>
          Consultar aptidão e saldo
        </button>
        {eligibility ? (
          <div className="rounded bg-yellow-50 p-2 text-sm">
            <p>Aptidão: <strong>{eligibility}</strong></p>
            <p>Esta família está com aptidão Pendente. Justificativa e autorizador são obrigatórios.</p>
          </div>
        ) : null}
        {lots.map((lot) => (
          <div key={lot.lotId} className="flex items-center gap-2 border-t pt-2 text-sm">
            <span className="w-full">{lot.itemName} — saldo {lot.onHand} {lot.unitSymbol}</span>
            <input className="w-24 rounded border px-2 py-1" placeholder="Qtd." value={lot.quantity} onChange={(e) => setLots(lots.map((row) => (row.lotId === lot.lotId ? { ...row, quantity: e.target.value } : row)))} />
          </div>
        ))}
        <input className="rounded border px-3 py-2 text-sm" placeholder="Executor (nome)" value={executorName} onChange={(e) => setExecutorName(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Executor (função)" value={executorRole} onChange={(e) => setExecutorRole(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Justificativa (mín. 3 letras)" value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Autorizado por (obrigatório)" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
        <button type="button" onClick={() => void handleConfirm()} className="rounded bg-primary-action px-4 py-2 text-sm text-white" disabled={loading}>
          Confirmar entrega
        </button>
      </div>
    </div>
  );
}
