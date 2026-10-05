import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DynamicLines, createLineKey, type LineItem } from "../../../../shared/presentation/components/DynamicLines.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { getItem, listItems } from "../api/inventory.api.js";
import { listBazarTransfers, registerBazarTransfer, type BazarTransferItem } from "../api/bazar.api.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";

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
    <div className="mx-auto max-w-[960px]">
      <PageHeader title="Recebimento do Bazar" />
      <p className="mt-xs font-sans text-sm text-text-muted">Referência única por transferência; reapresentação não cria segunda entrada.</p>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md grid gap-md rounded-lg border border-border bg-surface p-lg">
        <h3 className="font-display text-lg font-semibold text-text-strong">Nova transferência</h3>
        <label className="block font-sans text-sm font-semibold text-text">Referência do Bazar *
          <input className="field-input mt-xs font-mono font-normal" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} />
        </label>
        <label className="block font-sans text-sm font-semibold text-text">Doador (opcional)
          <input className="field-input mt-xs font-normal" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </label>
        <label className="block font-sans text-sm font-semibold text-text">Data do recebimento
          <input type="date" className="field-input mt-xs font-normal" value={receivedAt} max={today()} onChange={(e) => setReceivedAt(e.target.value)} />
        </label>
        <label className="block font-sans text-sm font-semibold text-text">Nota (opcional)
          <textarea className="field-input mt-xs h-auto min-h-[88px] py-sm font-normal" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
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
              <div className="grid grid-cols-2 gap-sm">
                <label className="block font-sans text-sm font-semibold text-text">Informada *
                  <input className="field-input mt-xs font-mono font-normal" inputMode="decimal" value={line.informedQuantity} onChange={(e) => onChange({ ...line, informedQuantity: e.target.value })} />
                </label>
                <label className="block font-sans text-sm font-semibold text-text">Recebida *
                  <input className="field-input mt-xs font-mono font-normal" inputMode="decimal" value={line.receivedQuantity} onChange={(e) => onChange({ ...line, receivedQuantity: e.target.value })} />
                </label>
                <label className="block font-sans text-sm font-semibold text-text">Aceita *
                  <input className="field-input mt-xs font-mono font-normal" inputMode="decimal" value={line.acceptedQuantity} onChange={(e) => onChange({ ...line, acceptedQuantity: e.target.value })} />
                </label>
                <label className="block font-sans text-sm font-semibold text-text">Descartada *
                  <input className="field-input mt-xs font-mono font-normal" inputMode="decimal" value={line.rejectedQuantity} onChange={(e) => onChange({ ...line, rejectedQuantity: e.target.value })} />
                </label>
              </div>
              {Number(line.informedQuantity) >= 0 && line.informedQuantity !== "" && Number(line.receivedQuantity) !== Number(line.informedQuantity) ? (
                <p className="rounded-md border border-accentOrange bg-aptPendingBg px-md py-sm font-sans text-sm text-aptPendingText">Divergência informada/recebida: {Number(line.receivedQuantity) - Number(line.informedQuantity)}</p>
              ) : null}
              {Number(line.rejectedQuantity) > 0 ? (
                <label className="block font-sans text-sm font-semibold text-text">Motivo do descarte *
                  <input className="field-input mt-xs font-normal" value={line.rejectionReason} onChange={(e) => onChange({ ...line, rejectionReason: e.target.value })} />
                </label>
              ) : null}
              {line.requiresExpiration ? (
                <label className="block font-sans text-sm font-semibold text-text">Validade *
                  <input type="date" className="field-input mt-xs font-normal" value={line.expiresOn} onChange={(e) => onChange({ ...line, expiresOn: e.target.value })} />
                </label>
              ) : null}
              {lineError(line) ? <p className="rounded-md border border-accentOrange bg-aptPendingBg px-md py-sm font-sans text-sm text-aptPendingText">{lineError(line)}</p> : null}
            </div>
          )}
        />
        <Button type="button" variant="primary" onClick={() => void handleSubmit()} disabled={loading}>
          Registrar transferência
        </Button>
      </div>
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <h3 className="font-display text-lg font-semibold text-text-strong">Transferências</h3>
        <table className="mt-sm w-full font-sans text-sm text-text">
          <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Referência</th><th className="px-md py-sm font-bold text-secondary-dark">Ações</th></tr></thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.transferId} className="border-b border-border">
                <td className="px-md py-sm font-mono text-xs">{transfer.externalReference}</td>
                <td className="px-md py-sm"><Link to={`/inventory/bazar-transfers/${transfer.transferId}`} className="font-sans text-sm font-semibold text-primary-action underline">Ver</Link></td>
              </tr>
            ))}
            {transfers.length === 0 ? <tr><td colSpan={2} className="py-md text-center font-sans text-sm text-text-muted">Nenhuma transferência</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
