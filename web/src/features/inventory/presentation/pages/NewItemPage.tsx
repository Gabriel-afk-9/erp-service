import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createItem, listCategories, listUnits } from "../api/inventory.api.js";

export function NewItemPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ categoryId: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ unitId: string; symbol: string }[]>([]);
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [unitId, setUnitId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresExpiration, setRequiresExpiration] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const [cats, uns] = await Promise.all([listCategories({ onlyActive: true }), listUnits({ onlyActive: true })]);
        setCategories(cats.categories);
        setUnits(uns.units);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    }
    void init();
  }, []);

  async function handleSubmit(): Promise<void> {
    if (!categoryId || !unitId || name.trim().length < 2 || requiresExpiration === null) {
      setFeedback("Preencha categoria, unidade, nome e se requer validade.");
      return;
    }
    setLoading(true);
    try {
      await createItem({ categoryId, unitId, name: name.trim(), description: description.trim() || undefined, requiresExpiration });
      await navigate("/inventory/items");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Novo item</h2>
      {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
      <div className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-md">
        <select className="rounded border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Selecione a categoria</option>
          {categories.map((cat) => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">Selecione a unidade</option>
          {units.map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.symbol}</option>)}
        </select>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Nome (mín. 2 letras)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <fieldset className="text-sm">
          <legend className="font-bold">Requer validade? (obrigatório)</legend>
          <label className="mr-4 flex items-center gap-1"><input type="radio" name="exp" checked={requiresExpiration === true} onChange={() => setRequiresExpiration(true)} /> Sim</label>
          <label className="flex items-center gap-1"><input type="radio" name="exp" checked={requiresExpiration === false} onChange={() => setRequiresExpiration(false)} /> Não</label>
        </fieldset>
        <button type="button" onClick={() => void handleSubmit()} className="rounded bg-primary-action px-4 py-2 text-sm text-white" disabled={loading}>Criar item</button>
      </div>
    </div>
  );
}
