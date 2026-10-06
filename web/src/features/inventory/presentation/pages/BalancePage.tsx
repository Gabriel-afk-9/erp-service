import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
import { StatusTag } from "../../../../shared/presentation/components/StatusTag.js";
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
      <PageHeader title="Saldo do estoque social" />
      <p className="mt-xs font-sans text-sm text-text-muted">Físico nunca negativo; disponível exclui lotes vencidos.</p>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md flex flex-wrap items-end gap-sm rounded-lg border border-border bg-surface p-md">
        <label className="flex min-w-0 flex-1 flex-col gap-xs font-sans text-sm font-semibold text-text">
          Buscar
          <input className="field-input font-normal" placeholder="Buscar por nome" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        </label>
        <label className="flex flex-col gap-xs font-sans text-sm font-semibold text-text">
          Categoria
          <select className="field-input w-auto font-normal" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
          </select>
        </label>
        <Button type="button" onClick={() => void load()} disabled={loading}>Buscar</Button>
      </div>
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <DataTable
          columns={[
            { key: "name", label: "Item" },
            { key: "categoryName", label: "Categoria" },
            { key: "onHand", label: "Em mãos", render: (row) => <span className="font-mono">{`${(row as BalanceRow).onHand} ${(row as BalanceRow).unitSymbol}`}</span> },
            { key: "available", label: "Disponível", render: (row) => <span className="font-mono font-semibold">{`${(row as BalanceRow).available} ${(row as BalanceRow).unitSymbol}`}</span> },
            {
              key: "alert",
              label: "Alerta",
              render: (row) =>
                expiringIds.has((row as BalanceRow).itemId) ? (
                  <StatusTag tone="ineligible" icon="event_busy" label="Vencimento próximo" />
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              label: "Ações",
              render: (row) => (
                <span className="flex gap-2">
                  <Link to={`/inventory/items/${(row as BalanceRow).itemId}/movements`} className="text-primary-action underline">Movimentos</Link>
                  <button type="button" onClick={() => setAdjustTarget(row as BalanceRow)} className="text-primary-action underline">Ajuste</button>
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
