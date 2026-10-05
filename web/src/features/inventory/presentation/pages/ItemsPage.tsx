import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { deactivateItem, listCategories, listItems, updateItem, type InventoryItem } from "../api/inventory.api.js";

export function ItemsPage() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [categories, setCategories] = useState<{ categoryId: string; name: string }[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<InventoryItem | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const result = await listItems({ q: q.trim() || undefined, categoryId: categoryId || undefined, onlyActive: showInactive ? false : true });
      setItems(result.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const cats = await listCategories({ onlyActive: false });
        setCategories(cats.categories);
      } catch {
        setCategories([]);
      }
      await load();
    }
    void init();
  }, []);

  async function handleDeactivate(values: Record<string, string>): Promise<void> {
    if (!deactivateTarget) return;
    setLoading(true);
    try {
      await deactivateItem(deactivateTarget.itemId, { reason: values.reason ?? "", expectedRevision: deactivateTarget.revision });
      setDeactivateTarget(null);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(values: Record<string, string>): Promise<void> {
    if (!editTarget) return;
    setLoading(true);
    try {
      await updateItem(editTarget.itemId, {
        description: values.description === "" ? null : (values.description ?? null),
        name: values.name && values.name !== editTarget.name ? values.name : undefined,
        reason: values.reason ?? "",
        expectedRevision: editTarget.revision,
      });
      setEditTarget(null);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Itens</h2>
        <Link to="/inventory/items/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">+ Novo item</Link>
      </div>
      <div className="mt-4 flex gap-2">
        <input className="w-full rounded border px-3 py-2" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        <select className="rounded border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((cat) => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
        </select>
        <button type="button" onClick={() => void load()} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>Buscar</button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inativas
      </label>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Nome</th><th className="pr-2">Categoria</th><th className="pr-2">Unidade</th><th className="pr-2">Validade</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.itemId} className="border-t">
                <td className="pr-2">{item.name}</td>
                <td className="pr-2">{item.categoryName}</td>
                <td className="pr-2">{item.unitSymbol}</td>
                <td className="pr-2">{item.requiresExpiration ? "✓" : "✗"}</td>
                <td className="pr-2">{item.isActive ? "Ativo" : "Inativo"}</td>
                <td className="flex gap-2">
                  <Link to={`/inventory/items/${item.itemId}/movements`} className="text-blue-700 underline">Movimentos</Link>
                  <button type="button" onClick={() => setEditTarget(item)} className="text-blue-700 underline">Editar</button>
                  {item.isActive ? <button type="button" onClick={() => setDeactivateTarget(item)} className="text-red-700 underline">Desativar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={6} className="py-4 text-center text-gray-500">Nenhum item encontrado</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={editTarget !== null}
        title={`Editar item — ${editTarget?.name ?? ""}`}
        fields={[
          { defaultValue: editTarget?.name ?? "", label: "Nome", name: "name", required: true, type: "text" },
          { defaultValue: editTarget?.description ?? "", label: "Descrição", name: "description", type: "textarea" },
          { label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "text" },
        ]}
        confirmLabel="Salvar"
        onCancel={() => setEditTarget(null)}
        onConfirm={(values) => void handleEdit(values)}
      />
      <ConfirmModal
        open={deactivateTarget !== null}
        title={`Desativar item — ${deactivateTarget?.name ?? ""}`}
        fields={[{ label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "textarea" }]}
        confirmLabel="Desativar"
        danger
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={(values) => void handleDeactivate(values)}
      />
    </div>
  );
}
