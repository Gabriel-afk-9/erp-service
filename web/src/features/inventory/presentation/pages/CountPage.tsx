import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { closeStockCount, createStockCount, getItem, getItemBalance, listItems, recordCountLine } from "../api/inventory.api.js";

interface CountedLine {
  key: string;
  itemName: string;
  lotId: string | null;
  expectedQuantity: number | null;
  countedQuantity: number;
  variance: number;
}

export function CountPage() {
  const [note, setNote] = useState("");
  const [countId, setCountId] = useState<string | null>(null);
  const [lines, setLines] = useState<CountedLine[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [lotId, setLotId] = useState("");
  const [lotOptions, setLotOptions] = useState<{ lotId: string; onHand: number }[]>([]);
  const [countedQuantity, setCountedQuantity] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleOpen(): Promise<void> {
    setLoading(true);
    try {
      const output = await createStockCount({ note: note.trim() || null });
      setCountId(output.countId);
      setFeedback(`Contagem aberta com ${output.lineCount} lote(s) no instantâneo.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectItem(selectedId: string): Promise<void> {
    try {
      const [item, balance] = await Promise.all([getItem(selectedId), getItemBalance(selectedId)]);
      setItemId(item.itemId);
      setItemName(item.name);
      setUnitId(item.unitId);
      setLotId("");
      setLotOptions(balance.lots.map((lot) => ({ lotId: lot.lotId, onHand: lot.onHand })));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  async function handleRecordLine(): Promise<void> {
    if (!countId || !itemId) return;
    const counted = Number(countedQuantity);
    if (!(counted >= 0)) {
      setFeedback("Quantidade contada inválida.");
      return;
    }
    setLoading(true);
    try {
      const output = await recordCountLine(countId, {
        countedQuantity: counted,
        expiresOn: expiresOn || null,
        itemId: lotId ? undefined : itemId,
        lotId: lotId || null,
        unitId: lotId ? undefined : unitId,
      });
      const expected = lotOptions.find((lot) => lot.lotId === lotId)?.onHand ?? null;
      setLines([...lines, { countedQuantity: counted, expectedQuantity: expected, itemName, key: output.lineId, lotId: lotId || null, variance: output.variance }]);
      setCountedQuantity("");
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(): Promise<void> {
    if (!countId) return;
    setLoading(true);
    try {
      const output = await closeStockCount(countId);
      setResult(`${output.adjustments} ajuste(s) gerado(s).`);
      setConfirmClose(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Contagem física</h2>
      {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
      {result ? <p className="mt-3 text-sm text-green-700">{result}</p> : null}

      {countId === null ? (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-md">
          <h3 className="font-semibold">Etapa 1 — Abrir contagem</h3>
          <label className="block text-sm">Nota (opcional)
            <textarea className="mt-1 w-full rounded border px-2 py-1" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" onClick={() => void handleOpen()} className="rounded bg-primary-action px-4 py-2 text-sm text-white" disabled={loading}>
            Iniciar contagem
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-md">
            <h3 className="font-semibold">Etapa 2 — Registrar linhas</h3>
            <SearchSelect
              label="Item"
              placeholder="Digite ao menos 2 letras..."
              selectedLabel={itemName || undefined}
              onSearch={async (query) => {
                const result = await listItems({ q: query });
                return result.items.map((item) => ({ id: item.itemId, label: item.name, sublabel: item.unitSymbol }));
              }}
              onSelect={(id) => void handleSelectItem(id)}
            />
            {lotOptions.length > 0 ? (
              <label className="block text-sm">Lote (opcional — vazio conta material sem lote)
                <select className="mt-1 w-full rounded border px-2 py-1" value={lotId} onChange={(e) => setLotId(e.target.value)}>
                  <option value="">Sem lote (material avulso)</option>
                  {lotOptions.map((lot) => <option key={lot.lotId} value={lot.lotId}>Lote {lot.lotId.slice(0, 8)} — esperado {lot.onHand}</option>)}
                </select>
              </label>
            ) : null}
            <label className="block text-sm">Quantidade contada *
              <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={countedQuantity} onChange={(e) => setCountedQuantity(e.target.value)} />
            </label>
            <label className="block text-sm">Validade (material sem lote)
              <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </label>
            <button type="button" onClick={() => void handleRecordLine()} className="rounded bg-background border border-border px-4 py-2 text-sm" disabled={loading || !itemId}>
              + Registrar item
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface p-md">
            <h3 className="font-semibold">Linhas registradas</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Item</th><th className="pr-2">Esperado</th><th className="pr-2">Contado</th><th>Variância</th></tr></thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className={`border-t ${line.variance !== 0 ? "bg-orange-50" : ""}`}>
                    <td className="pr-2">{line.itemName}</td>
                    <td className="pr-2">{line.expectedQuantity ?? "—"}</td>
                    <td className="pr-2">{line.countedQuantity}</td>
                    <td>{line.variance > 0 ? `+${line.variance}` : line.variance}</td>
                  </tr>
                ))}
                {lines.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-text-muted">Nenhuma linha registrada</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface p-md">
            <h3 className="font-semibold">Etapa 3 — Fechar</h3>
            <p className="text-sm text-text-muted">Esta ação irá gerar ajustes automáticos de estoque.</p>
            <button type="button" onClick={() => setConfirmClose(true)} className="mt-2 rounded bg-primary-action px-4 py-2 text-sm text-white" disabled={loading || lines.length === 0 || result !== null}>
              Fechar contagem
            </button>
          </div>
          <ConfirmModal
            open={confirmClose}
            title="Confirmar fechamento"
            description="Ajustes automáticos serão gerados a partir das variâncias."
            confirmLabel="Fechar contagem"
            onCancel={() => setConfirmClose(false)}
            onConfirm={() => void handleClose()}
          />
        </>
      )}
      <Link to="/inventory/items" className="mt-4 inline-block text-sm text-primary-action underline">← Catálogo</Link>
    </div>
  );
}
