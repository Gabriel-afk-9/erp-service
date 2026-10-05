import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { createCategory, deactivateCategory, listCategories, updateCategory, type CategoryItem } from "../api/inventory.api.js";

export function CategoriesPage() {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryItem | null>(null);

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

  async function handleDeactivate(values: Record<string, string>): Promise<void> {
    if (!deactivateTarget) return;
    setLoading(true);
    try {
      await deactivateCategory(deactivateTarget.categoryId, { reason: values.reason ?? "", expectedRevision: deactivateTarget.revision });
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
      await updateCategory(editTarget.categoryId, {
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
      <h2 className="text-xl font-bold">Categorias</h2>
      <div className="mt-4 flex gap-2">
        <input className="w-full rounded border px-3 py-2" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        <button type="button" onClick={() => void load()} className="rounded bg-background border border-border px-4 py-2" disabled={loading}>Buscar</button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inativas
      </label>
      {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <h3 className="font-bold">Nova categoria</h3>
        <div className="mt-2 flex gap-2">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Nome (mín. 2 letras)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Descrição (opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          <button type="button" onClick={() => void handleCreate()} className="rounded bg-primary-action px-4 py-2 text-sm text-white" disabled={loading || newName.trim().length < 2}>Criar</button>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Nome</th><th className="pr-2">Descrição</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.categoryId} className="border-t">
                <td className="pr-2"><Link to={`/inventory/categories/${item.categoryId}`} className="text-primary-action underline">{item.name}</Link></td>
                <td className="pr-2">{item.description ?? "—"}</td>
                <td className="pr-2">{item.isActive ? "Ativa" : "Inativa"}</td>
                <td className="flex gap-2">
                  <button type="button" onClick={() => setEditTarget(item)} className="text-primary-action underline">Editar</button>
                  {item.isActive ? <button type="button" onClick={() => setDeactivateTarget(item)} className="text-aptIneligibleText underline">Desativar</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? <tr><td colSpan={4} className="py-4 text-center text-text-muted">Nenhuma categoria encontrada</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={editTarget !== null}
        title={`Editar categoria — ${editTarget?.name ?? ""}`}
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
        title={`Desativar categoria — ${deactivateTarget?.name ?? ""}`}
        fields={[{ label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "textarea" }]}
        confirmLabel="Desativar"
        danger
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={(values) => void handleDeactivate(values)}
      />
    </div>
  );
}
