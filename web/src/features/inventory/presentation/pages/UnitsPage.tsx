import { useEffect, useState } from "react";
import { createUnit, listUnits, type UnitItem } from "../api/inventory.api.js";

export function UnitsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState("0");
  const [quantityIncrement, setQuantityIncrement] = useState("1");

  async function load(inactive: boolean): Promise<void> {
    setLoading(true);
    try {
      const result = await listUnits({ onlyActive: inactive ? false : true });
      setUnits(result.units);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(showInactive);
  }, [showInactive]);

  async function handleCreate(): Promise<void> {
    setLoading(true);
    try {
      await createUnit({ symbol: symbol.trim(), name: name.trim(), decimalPlaces: Number(decimalPlaces), quantityIncrement: Number(quantityIncrement) });
      setSymbol("");
      setName("");
      await load(showInactive);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Unidades</h2>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inativas
      </label>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="font-bold">Nova unidade</h3>
        <div className="mt-2 grid gap-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Símbolo (ex: UN, KG)" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Nome (ex: Unidade)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Casas decimais (0–4)" value={decimalPlaces} onChange={(e) => setDecimalPlaces(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Incremento (ex: 1, 0.1)" value={quantityIncrement} onChange={(e) => setQuantityIncrement(e.target.value)} />
          {decimalPlaces === "0" ? <p className="text-sm text-gray-500">Quantidade somente inteira.</p> : null}
          <button type="button" onClick={() => void handleCreate()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Criar</button>
        </div>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Símbolo</th><th className="pr-2">Nome</th><th className="pr-2">Decimais</th><th className="pr-2">Incremento</th></tr></thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.unitId} className="border-t">
                <td className="pr-2">{unit.symbol}</td>
                <td className="pr-2">{unit.name}</td>
                <td className="pr-2">{unit.decimalPlaces}</td>
                <td className="pr-2">{unit.quantityIncrement}</td>
              </tr>
            ))}
            {units.length === 0 && !loading ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhuma unidade encontrada</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
