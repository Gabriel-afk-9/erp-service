import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { confirmDelivery, previewDelivery } from "../api/deliveries.api.js";
import { getItemBalance, listItems } from "../../../inventory/presentation/api/inventory.api.js";

interface LotRow {
  lotId: string;
  itemName: string;
  unitSymbol: string;
  onHand: number;
  quantity: string;
}

function newOperationKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function NewDeliveryPage() {
  const navigate = useNavigate();
  const [familyId, setFamilyId] = useState("");
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
    if (!familyId.trim()) {
      setFeedback("Informe o ID da família.");
      return;
    }
    setLoading(true);
    try {
      const preview = await previewDelivery(familyId.trim(), date);
      setEligibility(preview.eligibilityStatus);
      const stock = await listItems({});
      const rows: LotRow[] = [];
      for (const item of stock.items) {
        const balance = await getItemBalance(item.itemId);
        for (const lot of balance.lots) {
          if (lot.status !== "AVAILABLE" || lot.onHand <= 0) continue;
          rows.push({ lotId: lot.lotId, itemName: `${item.name}${lot.expiresOn ? ` (vale até ${lot.expiresOn.slice(0, 10)})` : ""}`, unitSymbol: item.unitSymbol, onHand: lot.onHand, quantity: "" });
        }
      }
      setLots(rows);
      if (preview.justificationRequired) {
        setFeedback(`Aptidão ${preview.eligibilityStatus}: justificativa e autorizador são obrigatórios.`);
      } else {
        setFeedback(null);
      }
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
    setLoading(true);
    try {
      await confirmDelivery({
        familyId: familyId.trim(),
        occurredAt: date,
        lines,
        executorName: executorName.trim(),
        executorRole: executorRole.trim(),
        exceptionReason: exceptionReason.trim() || undefined,
        authorizedBy: authorizedBy.trim() || undefined,
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
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded bg-white p-4 shadow">
        <input className="rounded border px-3 py-2 text-sm" placeholder="ID da família" value={familyId} onChange={(e) => setFamilyId(e.target.value)} />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" onClick={() => void handlePreview()} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>
          Consultar aptidão e saldo
        </button>
        {eligibility ? <p className="text-sm">Aptidão: <strong>{eligibility}</strong> (toda entrega PENDING exige justificativa)</p> : null}
        {lots.map((lot) => (
          <div key={lot.lotId} className="flex items-center gap-2 border-t pt-2 text-sm">
            <span className="w-full">{lot.itemName} — saldo {lot.onHand} {lot.unitSymbol}</span>
            <input className="w-24 rounded border px-2 py-1" placeholder="Qtd." value={lot.quantity} onChange={(e) => setLots(lots.map((row) => (row.lotId === lot.lotId ? { ...row, quantity: e.target.value } : row)))} />
          </div>
        ))}
        <input className="rounded border px-3 py-2 text-sm" placeholder="Executor (nome)" value={executorName} onChange={(e) => setExecutorName(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Executor (função)" value={executorRole} onChange={(e) => setExecutorRole(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Justificativa (obrigatória — PENDING)" value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Autorizado por (obrigatório)" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
        <button type="button" onClick={() => void handleConfirm()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>
          Confirmar entrega
        </button>
      </div>
    </div>
  );
}
