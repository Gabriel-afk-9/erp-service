import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchDeliveryReport, type DeliveryReport } from "../api/reports.api.js";
import { downloadCsv } from "../csv.js";

export function DeliveryReportPage() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [status, setStatus] = useState("");
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setReport(await fetchDeliveryReport({ from, status: status || undefined, to }));
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv(): void {
    if (!report) return;
    const rows: (string | number)[][] = [];
    for (const delivery of report.deliveries) {
      for (const line of delivery.lines) {
        rows.push([delivery.occurredAt, delivery.familyCode ?? "", delivery.status, line.itemName, line.quantity, line.unitSymbol]);
      }
    }
    downloadCsv(`relatorio-entregas-${from}-${to}.csv`, ["Data", "Família", "Status", "Item", "Quantidade", "Unidade"], rows);
  }

  return (
    <div>
      <Link to="/reports" className="text-sm text-blue-700 underline">← Relatórios</Link>
      <h2 className="mt-2 text-xl font-bold">Entregas por família</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow">
        <input type="date" className="rounded border px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="COMPLETED">Concluídas</option>
          <option value="REVERSED">Estornadas</option>
        </select>
        <button type="button" onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Gerar</button>
        {report ? <button type="button" onClick={exportCsv} className="rounded bg-gray-200 px-4 py-2 text-sm">Exportar CSV</button> : null}
      </div>
      {report ? (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Entregas</p><p className="text-xl font-bold">{report.deliveryCount}</p></div>
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Famílias</p><p className="text-xl font-bold">{report.familyCount}</p></div>
            <div className="rounded bg-white p-4 shadow"><p className="text-sm text-gray-600">Atendimentos</p><p className="text-xl font-bold">{report.serviceRecordCount}</p></div>
          </div>
          <div className="mt-4 rounded bg-white p-4 shadow">
            <h3 className="font-bold">Por item</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Item</th><th className="pr-2">Quantidade</th><th>Entregas</th></tr></thead>
              <tbody>
                {report.totalsByItem.map((total) => (
                  <tr key={`${total.itemId}-${total.unitSymbol}`} className="border-t"><td className="pr-2">{total.itemName}</td><td className="pr-2">{total.quantity} {total.unitSymbol}</td><td>{total.deliveryCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded bg-white p-4 shadow">
            <h3 className="font-bold">Entregas</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Família</th><th className="pr-2">Status</th><th>Itens</th></tr></thead>
              <tbody>
                {report.deliveries.map((delivery) => (
                  <tr key={delivery.deliveryId} className="border-t">
                    <td className="pr-2">{delivery.occurredAt}</td>
                    <td className="pr-2">{delivery.familyCode ?? "—"}</td>
                    <td className="pr-2">{delivery.status === "COMPLETED" ? "Concluída" : "Estornada"}</td>
                    <td>{delivery.lines.map((line) => `${line.itemName} (${line.quantity} ${line.unitSymbol})`).join(", ")}</td>
                  </tr>
                ))}
                {report.deliveries.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Sem entregas no período</td></tr> : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
