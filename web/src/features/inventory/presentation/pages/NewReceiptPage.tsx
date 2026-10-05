import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DynamicLines, createLineKey, type LineItem } from "../../../../shared/presentation/components/DynamicLines.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { confirmReceipt, getItem, listItems } from "../api/inventory.api.js";

interface ReceiptLine extends LineItem {
  itemId: string;
  itemName: string;
  unitSymbol: string;
  requiresExpiration: boolean;
  informedQuantity: string;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  rejectionReason: string;
  expiresOn: string;
}

const ORIGIN_TYPES = [
  { value: "PERSON", label: "Pessoa" },
  { value: "ORGANIZATION", label: "Organização" },
  { value: "CAMPAIGN", label: "Campanha" },
  { value: "AD_HOC", label: "Avulso" },
  { value: "UNKNOWN", label: "Não identificado" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newOperationKey(): string {
  return crypto.randomUUID();
}

export function NewReceiptPage() {
  const navigate = useNavigate();
  const operationKey = useMemo(() => newOperationKey(), []);
  const [originType, setOriginType] = useState("PERSON");
  const [donorName, setDonorName] = useState("");
  const [receivedAt, setReceivedAt] = useState(today());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function lineError(line: ReceiptLine): string | null {
    const received = Number(line.receivedQuantity);
    const accepted = Number(line.acceptedQuantity);
    const rejected = Number(line.rejectedQuantity);
    if (line.itemId === "") return "Selecione o item";
    if (!(received >= 0)) return "Recebida inválida";
    if (!(accepted >= 0) || !(rejected >= 0)) return "Aceita/descartada inválida";
    if (accepted + rejected !== received) return "Aceita + descartada deve ser igual à recebida";
    if (rejected > 0 && line.rejectionReason.trim() === "") return "Motivo do descarte obrigatório";
    if (line.requiresExpiration && line.expiresOn === "") return "Validade obrigatória";
    return null;
  }

  async function handleSubmit(): Promise<void> {
    if (lines.length === 0) {
      setFeedback("Adicione ao menos uma linha.");
      return;
    }
    for (const line of lines) {
      const error = lineError(line);
      if (error) {
        setFeedback(`Linha "${line.itemName || "?"}": ${error}.`);
        return;
      }
    }
    setLoading(true);
    try {
      const output = await confirmReceipt({
        donorName: donorName.trim() || null,
        lines: lines.map((line) => ({
          expiresOn: line.expiresOn || null,
          informedQuantity: line.informedQuantity === "" ? null : Number(line.informedQuantity),
          itemId: line.itemId,
          acceptedQuantity: Number(line.acceptedQuantity),
          receivedQuantity: Number(line.receivedQuantity),
          rejectedQuantity: Number(line.rejectedQuantity),
          rejectionReason: line.rejectionReason.trim() || null,
        })),
        note: note.trim() || null,
        operationKey,
        originType,
        receivedAt,
      });
      await navigate(`/inventory/receipts/${output.receiptId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setFeedback(message.includes("OPERATION_CONFLICT") || message.includes("409") ? "Recebimento já registrado" : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link to="/inventory/receipts" className="text-sm text-blue-700 underline">← Recebimentos</Link>
      <h2 className="mt-2 text-xl font-bold">Registrar recebimento</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded bg-white p-4 shadow">
        <label className="block text-sm">Origem
          <select className="mt-1 w-full rounded border px-2 py-1" value={originType} onChange={(e) => setOriginType(e.target.value)}>
            {ORIGIN_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">Doador (opcional)
          <input className="mt-1 w-full rounded border px-2 py-1" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </label>
        <label className="block text-sm">Data do recebimento
          <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={receivedAt} max={today()} onChange={(e) => setReceivedAt(e.target.value)} />
        </label>
        <label className="block text-sm">Nota (opcional)
          <textarea className="mt-1 w-full rounded border px-2 py-1" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="mb-2 font-semibold">Linhas</h3>
        <DynamicLines
          lines={lines}
          onChange={setLines}
          addLabel="+ Adicionar linha"
          createLine={() => ({ acceptedQuantity: "", expiresOn: "", informedQuantity: "", itemId: "", itemName: "", key: createLineKey(), receivedQuantity: "", rejectedQuantity: "0", rejectionReason: "", requiresExpiration: false, unitSymbol: "" })}
          renderLine={(line, _index, onChange) => (
            <div className="grid gap-2">
              <SearchSelect
                label="Item"
                placeholder="Digite ao menos 2 letras..."
                selectedLabel={line.itemName || undefined}
                onSearch={async (query) => {
                  const result = await listItems({ q: query });
                  return result.items.map((item) => ({ id: item.itemId, label: item.name, sublabel: item.unitSymbol }));
                }}
                onSelect={(id) => {
                  void (async () => {
                    const item = await getItem(id);
                    onChange({ ...line, itemId: item.itemId, itemName: item.name, requiresExpiration: item.requiresExpiration, unitSymbol: item.unitSymbol });
                  })();
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">Informada
                  <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={line.informedQuantity} onChange={(e) => onChange({ ...line, informedQuantity: e.target.value })} />
                </label>
                <label className="block text-sm">Recebida *
                  <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={line.receivedQuantity} onChange={(e) => onChange({ ...line, receivedQuantity: e.target.value })} />
                </label>
                <label className="block text-sm">Aceita *
                  <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={line.acceptedQuantity} onChange={(e) => onChange({ ...line, acceptedQuantity: e.target.value })} />
                </label>
                <label className="block text-sm">Descartada *
                  <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={line.rejectedQuantity} onChange={(e) => onChange({ ...line, rejectedQuantity: e.target.value })} />
                </label>
              </div>
              {Number(line.rejectedQuantity) > 0 ? (
                <label className="block text-sm">Motivo do descarte *
                  <input className="mt-1 w-full rounded border px-2 py-1" value={line.rejectionReason} onChange={(e) => onChange({ ...line, rejectionReason: e.target.value })} />
                </label>
              ) : null}
              {line.requiresExpiration ? (
                <label className="block text-sm">Validade *
                  <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={line.expiresOn} onChange={(e) => onChange({ ...line, expiresOn: e.target.value })} />
                </label>
              ) : null}
              {lineError(line) ? <p className="text-sm text-orange-700">⚠️ {lineError(line)}</p> : null}
            </div>
          )}
        />
        <button type="button" onClick={() => void handleSubmit()} className="mt-3 rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>
          Confirmar recebimento
        </button>
      </div>
    </div>
  );
}
