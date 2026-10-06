import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
import { SearchSelect } from "../../../../shared/presentation/components/SearchSelect.js";
import { listCategories, listItems } from "../../../inventory/presentation/api/inventory.api.js";
import { fetchStockRecords, fetchStockReport, type StockMovementRow, type StockReport } from "../api/reports.api.js";
import { downloadCsv } from "../csv.js";

const MOVEMENT_TYPES = ["", "DONATION_IN", "BAZAR_IN", "TRIAGE_DISCARD", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "OPENING_BALANCE", "DELIVERY_OUT", "DELIVERY_REVERSAL"];
const PAGE_SIZE = 20;

export function StockReportPage() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [movementType, setMovementType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ categoryId: string; name: string }[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemLabel, setItemLabel] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<StockReport | null>(null);
  const [records, setRecords] = useState<StockMovementRow[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [stale, setStale] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await listCategories({});
        setCategories(result.categories.map((category) => ({ categoryId: category.categoryId, name: category.name })));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  function filters() {
    return {
      categoryId: categoryId || undefined,
      from,
      itemId: itemId || undefined,
      movementType: movementType || undefined,
      to,
    };
  }

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setReport(await fetchStockReport(filters()));
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
      const result = await fetchStockRecords({ ...filters(), expectedQueryFingerprint: report.queryFingerprint, page: String(page), pageSize: String(PAGE_SIZE) });
      setRecords(result.movements);
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
    downloadCsv(
      `relatorio-estoque-${from}-${to}.csv`,
      ["Data", "Item", "Categoria", "Tipo", "Quantidade", "Unidade"],
      report.movements.map((movement) => [movement.occurredAt, movement.itemName, movement.categoryName, movement.type, movement.quantity, movement.unitSymbol]),
    );
  }

  return (
    <div>
      <Link to="/reports" className="font-sans text-sm font-semibold text-primary-action underline">← Relatórios</Link>
      <div className="mt-sm">
        <PageHeader title="Movimentação de estoque" />
      </div>
      <p className="mt-xs font-sans text-sm text-text-muted">Período, unidade e situação dos registros acompanham cada total.</p>
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
          Tipo
          <select className="field-input w-auto font-normal" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            {MOVEMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type === "" ? "Todos os tipos" : type}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
          Categoria
          <select className="field-input w-auto font-normal" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
          </select>
        </label>
        <div className="min-w-48">
          <SearchSelect
            label=""
            placeholder="Filtrar por item (opcional)"
            selectedLabel={itemLabel}
            onSearch={async (query) => {
              const result = await listItems({ q: query });
              return result.items.map((item) => ({ id: item.itemId, label: item.name, sublabel: item.unitSymbol }));
            }}
            onSelect={(id) => {
              setItemId(id);
              void (async () => {
                try {
                  const result = await listItems({ q: "" });
                  setItemLabel(result.items.find((item) => item.itemId === id)?.name ?? id);
                } catch {
                  setItemLabel(id);
                }
              })();
            }}
          />
        </div>
        {itemId ? <Button type="button" onClick={() => { setItemId(""); setItemLabel(undefined); }}>Limpar item</Button> : null}
        <Button type="button" variant="primary" onClick={() => void load()} disabled={loading}>Gerar</Button>
        {report ? <Button type="button" onClick={exportCsv}>Exportar CSV</Button> : null}
        {report ? <Button type="button" onClick={() => void loadDetails(1)} disabled={loading}>Ver detalhes</Button> : null}
      </div>
      {report ? (
        <>
          <div className="mt-md grid gap-md md:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Saldo inicial</p><p className="font-mono text-lg text-text-strong">{report.openingBalance}</p></div>
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Saldo final</p><p className="font-mono text-lg text-text-strong">{report.closingBalance}</p></div>
            <div className="rounded-lg border border-border bg-surface p-md"><p className="font-sans text-sm text-text-muted">Movimentos</p><p className="font-mono text-lg text-text-strong">{report.movements.length}</p></div>
          </div>
          <div className="mt-md rounded-lg border border-border bg-surface p-md">
            <h3 className="font-display text-lg font-semibold text-text-strong">Por tipo</h3>
            <table className="mt-sm w-full font-sans text-sm text-text">
              <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Tipo</th><th className="px-md py-sm font-bold text-secondary-dark">Entradas</th><th className="px-md py-sm font-bold text-secondary-dark">Saídas</th><th className="px-md py-sm font-bold text-secondary-dark">Saldo</th><th className="px-md py-sm font-bold text-secondary-dark">Qtd.</th></tr></thead>
              <tbody>
                {report.totalsByType.map((total) => (
                  <tr key={total.type} className="border-b border-border"><td className="px-md py-sm font-mono text-xs">{total.type}</td><td className="px-md py-sm font-mono">{total.inbound}</td><td className="px-md py-sm font-mono">{total.outbound}</td><td className="px-md py-sm font-mono">{total.net}</td><td className="px-md py-sm font-mono">{total.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-md rounded-lg border border-border bg-surface p-md">
            <h3 className="font-display text-lg font-semibold text-text-strong">Por item</h3>
            <table className="mt-sm w-full font-sans text-sm text-text">
              <thead><tr className="border-b-2 border-secondary-border bg-tableHeader text-left"><th className="px-md py-sm font-bold text-secondary-dark">Item</th><th className="px-md py-sm font-bold text-secondary-dark">Entradas</th><th className="px-md py-sm font-bold text-secondary-dark">Saídas</th><th className="px-md py-sm font-bold text-secondary-dark">Saldo</th></tr></thead>
              <tbody>
                {report.totalsByItem.map((total) => (
                  <tr key={total.itemId} className="border-b border-border"><td className="px-md py-sm">{total.itemName} <span className="font-mono text-xs text-text-muted">({total.unitSymbol})</span></td><td className="px-md py-sm font-mono">{total.inbound}</td><td className="px-md py-sm font-mono">{total.outbound}</td><td className="px-md py-sm font-mono">{total.net}</td></tr>
                ))}
                {report.totalsByItem.length === 0 ? <tr><td colSpan={4} className="py-md text-center font-sans text-sm text-text-muted">Sem movimentos no período</td></tr> : null}
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
              <h3 className="font-display text-lg font-semibold text-text-strong">Detalhe de movimentos</h3>
              <DataTable
                columns={[
                  { key: "occurredAt", label: "Data" },
                  { key: "itemName", label: "Item" },
                  { key: "type", label: "Tipo" },
                  { key: "quantity", label: "Qtd.", render: (row) => `${(row as StockMovementRow).quantity} ${(row as StockMovementRow).unitSymbol}` },
                ]}
                rows={records}
                page={recordsPage}
                pageSize={PAGE_SIZE}
                total={recordsTotal}
                onPageChange={(page) => void loadDetails(page)}
                loading={loading}
                emptyMessage="Sem movimentos no período"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
