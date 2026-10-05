import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DynamicLines, createLineKey, type LineItem } from "../../../../shared/presentation/components/DynamicLines.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getItem, listItems } from "../api/inventory.api.js";
import { listBazarTransfers, registerBazarTransfer, type BazarTransferItem } from "../api/bazar.api.js";

interface BazarLine extends LineItem {
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newOperationKey(): string {
  return crypto.randomUUID();
}

export function BazarPage() {
  const [transfers, setTransfers] = useState<BazarTransferItem[]>([]);
  const [externalReference, setExternalReference] = useState("");
  const [donorName, setDonorName] = useState("");
  const [receivedAt, setReceivedAt] = useState(today());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<BazarLine[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const operationKey = useMemo(() => newOperationKey(), []);

  async function load(): Promise<void> {
    try {
      setTransfers((await listBazarTransfers()).transfers);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function lineError(line: BazarLine): string | null {
    const received = Number(line.receivedQuantity);
    const accepted = Number(line.acceptedQuantity);
    const rejected = Number(line.rejectedQuantity);
    if (line.itemId === "") return "Selecione o item";
    if (line.informedQuantity === "" || !(Number(line.informedQuantity) >= 0)) return "Quantidade informada obrigatória";
    if (!(received >= 0) || !(accepted >= 0) || !(rejected >= 0)) return "Quantidades inválidas";
    if (accepted + rejected !== received) return "Aceita + descartada deve ser igual à recebida";
    if (rejected > 0 && line.rejectionReason.trim() === "") return "Motivo do descarte obrigatório";
    if (line.requiresExpiration && line.expiresOn === "") return "Validade obrigatória";
    return null;
  }

  async function handleSubmit(): Promise<void> {
    if (externalReference.trim() === "") {
      setFeedback("Informe a referência do Bazar.");
      return;
    }
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
      const output = await registerBazarTransfer({
        donorName: donorName.trim() || null,
        externalReference: externalReference.trim(),
        lines: lines.map((line) => ({
          acceptedQuantity: Number(line.acceptedQuantity),
          expiresOn: line.expiresOn || null,
          informedQuantity: Number(line.informedQuantity),
          itemId: line.itemId,
          receivedQuantity: Number(line.receivedQuantity),
          rejectedQuantity: Number(line.rejectedQuantity),
          rejectionReason: line.rejectionReason.trim() || null,
        })),
        note: note.trim() || null,
        operationKey,
        receivedAt,
      });
      setFeedback(output.duplicate ? "Esta referência já foi registrada anteriormente." : `Transferência registrada: ${output.transferId}`);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Recebimento do Bazar</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded bg-white p-4 shadow">
        <h3 className="font-semibold">Nova transferência</h3>
        <label className="block text-sm">Referência do Bazar *
          <input className="mt-1 w-full rounded border px-2 py-1" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} />
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
                <label className="block text-sm">Informada *
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
              {Number(line.informedQuantity) >= 0 && line.informedQuantity !== "" && Number(line.receivedQuantity) !== Number(line.informedQuantity) ? (
                <p className="text-sm text-orange-700">⚠️ Divergência informada/recebida: {Number(line.receivedQuantity) - Number(line.informedQuantity)}</p>
              ) : null}
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
        <button type="button" onClick={() => void handleSubmit()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>
          Registrar transferência
        </button>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="font-semibold">Transferências</h3>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Referência</th><th>Ações</th></tr></thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.transferId} className="border-t">
                <td className="pr-2">{transfer.externalReference}</td>
                <td><Link to={`/inventory/bazar-transfers/${transfer.transferId}`} className="text-blue-700 underline">Ver</Link></td>
              </tr>
            ))}
            {transfers.length === 0 ? <tr><td colSpan={2} className="py-4 text-center text-gray-500">Nenhuma transferência</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
