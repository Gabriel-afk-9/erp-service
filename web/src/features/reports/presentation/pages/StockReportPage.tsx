import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
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
        <select className="rounded border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
        </select>
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
        {itemId ? <button type="button" onClick={() => { setItemId(""); setItemLabel(undefined); }} className="rounded bg-gray-200 px-3 py-2 text-sm">Limpar item</button> : null}
        <button type="button" onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading}>Gerar</button>
        {report ? <button type="button" onClick={exportCsv} className="rounded bg-gray-200 px-4 py-2 text-sm">Exportar CSV</button> : null}
        {report ? <button type="button" onClick={() => void loadDetails(1)} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>Ver detalhes</button> : null}
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
            <h3 className="font-bold">Por item</h3>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left"><th className="pr-2">Item</th><th className="pr-2">Entradas</th><th className="pr-2">Saídas</th><th>Saldo</th></tr></thead>
              <tbody>
                {report.totalsByItem.map((total) => (
                  <tr key={total.itemId} className="border-t"><td className="pr-2">{total.itemName} ({total.unitSymbol})</td><td className="pr-2">{total.inbound}</td><td className="pr-2">{total.outbound}</td><td>{total.net}</td></tr>
                ))}
                {report.totalsByItem.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Sem movimentos no período</td></tr> : null}
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
              <h3 className="font-bold">Detalhe de movimentos</h3>
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
