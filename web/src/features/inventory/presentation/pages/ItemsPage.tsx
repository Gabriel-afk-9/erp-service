import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deactivateItem, listCategories, listItems, updateItem, type InventoryItem } from "../api/inventory.api.js";

export function ItemsPage() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [categories, setCategories] = useState<{ categoryId: string; name: string }[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function handleDeactivate(item: InventoryItem): Promise<void> {
    const reason = window.prompt("Motivo da desativação (mín. 3 letras):", "Sem uso");
    if (!reason || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await deactivateItem(item.itemId, { reason: reason.trim(), expectedRevision: item.revision });
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(item: InventoryItem): Promise<void> {
    const name = window.prompt("Novo nome:", item.name);
    if (!name || name.trim() === item.name) return;
    setLoading(true);
    try {
      await updateItem(item.itemId, { name: name.trim(), reason: "Correção de nome", expectedRevision: item.revision });
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
                  <button type="button" onClick={() => void handleRename(item)} className="text-blue-700 underline">Editar</button>
                  {item.isActive ? <button type="button" onClick={() => void handleDeactivate(item)} className="text-red-700 underline">Desativar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={6} className="py-4 text-center text-gray-500">Nenhum item encontrado</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
