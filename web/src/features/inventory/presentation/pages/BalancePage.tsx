import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { adjustStock, getItemBalance, listBalances, listCategories, type BalanceRow } from "../api/inventory.api.js";

function newOperationKey(): string {
  return crypto.randomUUID();
}

export function BalancePage() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ categoryId: string; name: string }[]>([]);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [expiringIds, setExpiringIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<BalanceRow | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const result = await listBalances({ categoryId: categoryId || undefined, q: query.trim() || undefined });
      setRows(result.items);
      setFeedback(null);
      const expiring = new Set<string>();
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 30);
      await Promise.all(
        result.items
          .filter((item) => item.requiresExpiration)
          .map(async (item) => {
            try {
              const balance = await getItemBalance(item.itemId);
              if (balance.lots.some((lot) => lot.status === "AVAILABLE" && lot.expiresOn !== null && new Date(lot.expiresOn) <= threshold)) {
                expiring.add(item.itemId);
              }
            } catch {
              // Expiry detail is best-effort; the balance table still renders.
            }
          }),
      );
      setExpiringIds(expiring);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const result = await listCategories({});
        setCategories(result.categories.map((category) => ({ categoryId: category.categoryId, name: category.name })));
      } catch {
        // Category filter is optional; the balance table still renders.
      }
    })();
    void load();
  }, []);

  async function handleAdjust(values: Record<string, string>): Promise<void> {
    if (!adjustTarget) return;
    const quantity = Number(values.quantity);
    if (!(quantity > 0)) {
      setFeedback("Quantidade inválida para ajuste.");
      return;
    }
    try {
      await adjustStock({
        direction: values.direction === "Saída" ? "OUT" : "IN",
        itemId: adjustTarget.itemId,
        operationKey: newOperationKey(),
        quantity,
        reason: values.reason ?? "",
      });
      setAdjustTarget(null);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Saldo geral</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Buscar por nome" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        <select className="rounded border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
        </select>
        <button type="button" onClick={() => void load()} className="rounded bg-gray-200 px-4 py-2 text-sm" disabled={loading}>Buscar</button>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <DataTable
          columns={[
            { key: "name", label: "Item" },
            { key: "categoryName", label: "Categoria" },
            { key: "onHand", label: "Em mãos", render: (row) => `${(row as BalanceRow).onHand} ${(row as BalanceRow).unitSymbol}` },
            { key: "available", label: "Disponível", render: (row) => `${(row as BalanceRow).available} ${(row as BalanceRow).unitSymbol}` },
            {
              key: "alert",
              label: "Alerta",
              render: (row) =>
                expiringIds.has((row as BalanceRow).itemId) ? (
                  <span title="Lotes próximos do vencimento">📅</span>
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              label: "Ações",
              render: (row) => (
                <span className="flex gap-2">
                  <Link to={`/inventory/items/${(row as BalanceRow).itemId}/movements`} className="text-blue-700 underline">Movimentos</Link>
                  <button type="button" onClick={() => setAdjustTarget(row as BalanceRow)} className="text-blue-700 underline">Ajuste</button>
                </span>
              ),
            },
          ]}
          rows={rows}
          page={1}
          pageSize={Math.max(rows.length, 1)}
          total={rows.length}
          onPageChange={() => undefined}
          loading={loading}
          emptyMessage="Nenhum item com saldo"
        />
      </div>
      <ConfirmModal
        open={adjustTarget !== null}
        title={`Ajuste de estoque — ${adjustTarget?.name ?? ""}`}
        description="O ajuste gera um movimento imediato no estoque."
        fields={[
          { defaultValue: "Entrada", label: "Direção", name: "direction", options: ["Entrada", "Saída"], required: true, type: "select" },
          { label: "Quantidade", name: "quantity", required: true, type: "text" },
          { label: "Motivo (mín. 3 letras)", minLength: 3, name: "reason", required: true, type: "textarea" },
        ]}
        confirmLabel="Aplicar ajuste"
        onCancel={() => setAdjustTarget(null)}
        onConfirm={(values) => void handleAdjust(values)}
      />
    </div>
  );
}
