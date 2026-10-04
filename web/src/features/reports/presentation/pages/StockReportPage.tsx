import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchStockReport, type StockReport } from "../api/reports.api.js";
import { downloadCsv } from "../csv.js";

const MOVEMENT_TYPES = ["", "DONATION_IN", "BAZAR_IN", "TRIAGE_DISCARD", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "OPENING_BALANCE", "DELIVERY_OUT", "DELIVERY_REVERSAL"];

export function StockReportPage() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [movementType, setMovementType] = useState("");
  const [report, setReport] = useState<StockReport | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setReport(await fetchStockReport({ from, movementType: movementType || undefined, to }));
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv(): void {
    if (!report) return;
    downloadCsv(
      `relatorio-estoque-${from}-${to}.csv`,
      ["Data", "Item", "Categoria", "Tipo", "Quantidade", "Unidade"],
      report.movements.map((movement) => [movement.occurredAt, movement.itemName, movement.categoryName, movement.type, movement.quantity, movement.unitSymbol]),
    );
  }

  return (
    <div>
      <Link to="/reports" className="text-sm text-blue-700 underline">← Relatórios</Link>
      <h2 className="mt-2 text-xl font-bold">Movimentação de estoque</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow">
        <input type="date" className="rounded border px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>{type === "" ? "Todos os tipos" : type}</option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Gerar</button>
        {report ? <button type="button" onClick={exportCsv} className="rounded bg-gray-200 px-4 py-2 text-sm">Exportar CSV</button> : null}
      </div>
      {report ? (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Saldo inicial</p><p className="text-xl font-bold">{report.openingBalance}</p></div>
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Saldo final</p><p className="text-xl font-bold">{report.closingBalance}</p></div>
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Movimentos</p><p className="text-xl font-bold">{report.movements.length}</p></div>
          </div>
          <div className="mt-4 rounded bg-white p-4 shadow">
            <h3 className="font-bold">Por tipo</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Tipo</th><th className="pr-2">Entradas</th><th className="pr-2">Saídas</th><th className="pr-2">Saldo</th><th>Qtd.</th></tr></thead>
              <tbody>
                {report.totalsByType.map((total) => (
                  <tr key={total.type} className="border-t"><td className="pr-2">{total.type}</td><td className="pr-2">{total.inbound}</td><td className="pr-2">{total.outbound}</td><td className="pr-2">{total.net}</td><td>{total.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded bg-white p-4 shadow">
            <h3 className="font-bold">Movimentos</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Item</th><th className="pr-2">Tipo</th><th>Qtd.</th></tr></thead>
              <tbody>
                {report.movements.map((movement) => (
                  <tr key={movement.movementId} className="border-t"><td className="pr-2">{movement.occurredAt}</td><td className="pr-2">{movement.itemName}</td><td className="pr-2">{movement.type}</td><td>{movement.quantity} {movement.unitSymbol}</td></tr>
                ))}
                {report.movements.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Sem movimentos no período</td></tr> : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
