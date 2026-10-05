import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { searchFamilies } from "../../../registration/presentation/api/families.api.js";
import { fetchDeliveryRecords, fetchDeliveryReport, type DeliveryReport, type DeliveryReportRow } from "../api/reports.api.js";
import { downloadCsv } from "../csv.js";

const PAGE_SIZE = 20;

export function DeliveryReportPage() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [status, setStatus] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [familyLabel, setFamilyLabel] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [records, setRecords] = useState<DeliveryReportRow[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [stale, setStale] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function filters() {
    return { familyId: familyId || undefined, from, status: status || undefined, to };
  }

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setReport(await fetchDeliveryReport(filters()));
      setShowDetails(false);
      setStale(false);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(page: number): Promise<void> {
    if (!report) return;
    setLoading(true);
    try {
      const result = await fetchDeliveryRecords({ ...filters(), expectedQueryFingerprint: report.queryFingerprint, page: String(page), pageSize: String(PAGE_SIZE) });
      setRecords(result.deliveries);
      setRecordsTotal(result.total);
      setRecordsPage(result.page);
      setShowDetails(true);
      setStale(false);
      setFeedback(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      if (message.includes("REPORT_CHANGED")) {
        setStale(true);
        setShowDetails(false);
      } else {
        setFeedback(message);
      }
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
        <div className="min-w-48">
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
                  const result = await searchFamilies({ q: "" });
                  const found = result.items.find((item) => item.familyId === id);
                  setFamilyLabel(found ? `${found.referenceName ?? "Sem nome"} (${found.code})` : id);
                } catch {
                  setFamilyLabel(id);
                }
              })();
            }}
          />
        </div>
        {familyId ? <button type="button" onClick={() => { setFamilyId(""); setFamilyLabel(undefined); }} className="rounded bg-gray-200 px-3 py-2 text-sm">Limpar</button> : null}
        <button type="button" onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Gerar</button>
        {report ? <button type="button" onClick={exportCsv} className="rounded bg-gray-200 px-4 py-2 text-sm">Exportar CSV</button> : null}
        {report ? <button type="button" onClick={() => void loadDetails(1)} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>Ver detalhes</button> : null}
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
              <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Família</th><th className="pr-2">Status</th><th className="pr-2">Aptidão</th><th>Itens</th></tr></thead>
              <tbody>
                {report.deliveries.map((delivery) => (
                  <tr key={delivery.deliveryId} className="border-t">
                    <td className="pr-2">{delivery.occurredAt}</td>
                    <td className="pr-2">{delivery.familyCode ?? "—"}</td>
                    <td className="pr-2">{delivery.status === "COMPLETED" ? "Concluída" : "Estornada"}</td>
                    <td className="pr-2">{delivery.eligibilityStatus}</td>
                    <td>{delivery.lines.map((line) => `${line.itemName} (${line.quantity} ${line.unitSymbol})`).join(", ")}</td>
                  </tr>
                ))}
                {report.deliveries.length === 0 ? <tr><td colSpan={5} className="py-4 text-center text-gray-500">Sem entregas no período</td></tr> : null}
              </tbody>
            </table>
          </div>
          {stale ? (
            <div className="mt-4 rounded bg-yellow-50 p-4 text-sm shadow">
              Os dados foram atualizados. Recarregue o relatório para ver os dados atuais.
              <button type="button" onClick={() => void load()} className="ml-2 rounded bg-gray-800 px-3 py-1 text-white">Recarregar</button>
            </div>
          ) : null}
          {showDetails ? (
            <div className="mt-4 rounded bg-white p-4 shadow">
              <h3 className="font-bold">Detalhe de entregas</h3>
              <DataTable
                columns={[
                  { key: "occurredAt", label: "Data" },
                  { key: "familyCode", label: "Família", render: (row) => (row as DeliveryReportRow).familyCode ?? "—" },
                  { key: "status", label: "Status", render: (row) => ((row as DeliveryReportRow).status === "COMPLETED" ? "Concluída" : "Estornada") },
                  { key: "eligibilityStatus", label: "Aptidão" },
                  { key: "lines", label: "Itens", render: (row) => (row as DeliveryReportRow).lines.map((line) => `${line.itemName} (${line.quantity})`).join(", ") },
                ]}
                rows={records}
                page={recordsPage}
                pageSize={PAGE_SIZE}
                total={recordsTotal}
                onPageChange={(page) => void loadDetails(page)}
                loading={loading}
                emptyMessage="Sem entregas no período"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
