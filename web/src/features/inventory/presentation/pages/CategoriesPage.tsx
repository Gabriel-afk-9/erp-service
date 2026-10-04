import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createCategory, deactivateCategory, listCategories, updateCategory, type CategoryItem } from "../api/inventory.api.js";

export function CategoriesPage() {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function load(): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await listCategories({ q: q.trim() || undefined, onlyActive: showInactive ? false : true });
      setItems(result.categories);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(): Promise<void> {
    setLoading(true);
    try {
      await createCategory({ name: newName.trim(), description: newDescription.trim() || undefined });
      setNewName("");
      setNewDescription("");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(item: CategoryItem): Promise<void> {
    const reason = window.prompt("Motivo da desativação (mín. 3 letras):", "Sem uso");
    if (!reason || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await deactivateCategory(item.categoryId, { reason: reason.trim(), expectedRevision: item.revision });
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(item: CategoryItem): Promise<void> {
    const name = window.prompt("Novo nome:", item.name);
    if (!name || name.trim() === item.name) return;
    setLoading(true);
    try {
      await updateCategory(item.categoryId, { name: name.trim(), reason: "Correção de nome", expectedRevision: item.revision });
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Categorias</h2>
      <div className="mt-4 flex gap-2">
        <input className="w-full rounded border px-3 py-2" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        <button type="button" onClick={() => void load()} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>Buscar</button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inativas
      </label>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="font-bold">Nova categoria</h3>
        <div className="mt-2 flex gap-2">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Nome (mín. 2 letras)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Descrição (opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          <button type="button" onClick={() => void handleCreate()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading || newName.trim().length < 2}>Criar</button>
        </div>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Nome</th><th className="pr-2">Descrição</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.categoryId} className="border-t">
                <td className="pr-2"><Link to={`/inventory/categories/${item.categoryId}`} className="text-blue-700 underline">{item.name}</Link></td>
                <td className="pr-2">{item.description ?? "—"}</td>
                <td className="pr-2">{item.isActive ? "Ativa" : "Inativa"}</td>
                <td className="flex gap-2">
                  <button type="button" onClick={() => void handleRename(item)} className="text-blue-700 underline">Editar</button>
                  {item.isActive ? <button type="button" onClick={() => void handleDeactivate(item)} className="text-red-700 underline">Desativar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhuma categoria encontrada</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
