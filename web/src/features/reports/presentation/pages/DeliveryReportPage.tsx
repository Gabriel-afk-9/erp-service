import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
import { StatusTag } from "../../../../shared/presentation/components/StatusTag.js";
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
      <Link to="/reports" className="font-sans text-sm font-semibold text-primary-action underline">← Relatórios</Link>
      <div className="mt-sm">
        <PageHeader title="Entregas por família" />
      </div>
      <p className="mt-xs font-sans text-sm text-text-muted">Uma família atendida várias vezes conta como uma família; entregas aparecem uma única vez.</p>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md flex flex-wrap items-end gap-sm rounded-lg border border-border bg-surface p-md">
        <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
          Início
          <input type="date" className="field-input w-auto font-normal" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
          Fim
          <input type="date" className="field-input w-auto font-normal" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
          Status
          <select className="field-input w-auto font-normal" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="REVERSED">Estornadas</option>
          </select>
        </label>
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
        {familyId ? <Button type="button" onClick={() => { setFamilyId(""); setFamilyLabel(undefined); }}>Limpar</Button> : null}
        <Button type="button" variant="primary" onClick={() => void load()} disabled={loading}>Gerar</Button>
        {report ? <Button type="button" onClick={exportCsv}>Exportar CSV</Button> : null}
        {report ? <Button type="button" onClick={() => void loadDetails(1)} disabled={loading}>Ver detalhes</Button> : null}
      </div>
      {report ? (
        <>
          <div className="mt-md grid gap-md md:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Entregas</p><p className="font-mono text-lg text-text-strong">{report.deliveryCount}</p></div>
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Famílias</p><p className="font-mono text-lg text-text-strong">{report.familyCount}</p></div>
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Atendimentos</p><p className="font-mono text-lg text-text-strong">{report.serviceRecordCount}</p></div>
          </div>
          <div className="mt-md rounded-lg border border-border bg-surface p-md">
            <h3 className="font-display text-lg font-semibold text-text-strong">Por item</h3>
            <table className="mt-sm w-full font-sans text-sm text-text">
              <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Item</th><th className="px-md py-sm font-bold text-secondary-dark">Quantidade</th><th className="px-md py-sm font-bold text-secondary-dark">Entregas</th></tr></thead>
              <tbody>
                {report.totalsByItem.map((total) => (
                  <tr key={`${total.itemId}-${total.unitSymbol}`} className="border-b border-border"><td className="px-md py-sm">{total.itemName}</td><td className="px-md py-sm font-mono">{total.quantity} {total.unitSymbol}</td><td className="px-md py-sm font-mono">{total.deliveryCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-md rounded-lg border border-border bg-surface p-md">
            <h3 className="font-display text-lg font-semibold text-text-strong">Entregas</h3>
            <table className="mt-sm w-full font-sans text-sm text-text">
              <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Data</th><th className="px-md py-sm font-bold text-secondary-dark">Família</th><th className="px-md py-sm font-bold text-secondary-dark">Status</th><th className="px-md py-sm font-bold text-secondary-dark">Aptidão</th><th className="px-md py-sm font-bold text-secondary-dark">Itens</th></tr></thead>
              <tbody>
                {report.deliveries.map((delivery) => (
                  <tr key={delivery.deliveryId} className="border-b border-border">
                    <td className="px-md py-sm font-mono text-xs">{delivery.occurredAt}</td>
                    <td className="px-md py-sm font-mono text-xs">{delivery.familyCode ?? "—"}</td>
                    <td className="px-md py-sm">{delivery.status === "COMPLETED" ? <StatusTag tone="neutral" icon="check_circle" label="Concluída" /> : <StatusTag tone="pending" icon="history" label="Estornada" />}</td>
                    <td className="px-md py-sm font-mono text-xs">{delivery.eligibilityStatus}</td>
                    <td className="px-md py-sm">{delivery.lines.map((line) => `${line.itemName} (${line.quantity} ${line.unitSymbol})`).join(", ")}</td>
                  </tr>
                ))}
                {report.deliveries.length === 0 ? <tr><td colSpan={5} className="py-md text-center font-sans text-sm text-text-muted">Sem entregas no período</td></tr> : null}
              </tbody>
            </table>
          </div>
          {stale ? (
            <div className="mt-md rounded-md border border-accentOrange bg-aptPendingBg p-md font-sans text-sm text-aptPendingText">
              Os dados foram atualizados. Recarregue o relatório para ver os dados atuais.
              <Button type="button" variant="primary" className="ml-sm" onClick={() => void load()}>Recarregar</Button>
            </div>
          ) : null}
          {showDetails ? (
            <div className="mt-md rounded-lg border border-border bg-surface p-md">
              <h3 className="font-display text-lg font-semibold text-text-strong">Detalhe de entregas</h3>
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
