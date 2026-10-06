import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategory } from "../api/inventory.api.js";

interface DetailItem {
  itemId: string;
  name: string;
  unitSymbol: string;
  requiresExpiration: boolean;
  isActive: boolean;
}

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [items, setItems] = useState<DetailItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      try {
        const data = await getCategory(id);
        setName(data.name);
        setItems(data.items);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro inesperado");
      }
    }
    void load();
  }, [id]);

  return (
    <div>
      <Link to="/inventory/categories" className="text-sm text-primary-action underline">← Voltar para categorias</Link>
      <h2 className="mt-2 text-xl font-bold">{name || "Categoria"}</h2>
      {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
      <div className="mt-4 rounded-lg border border-border bg-surface p-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Itens da categoria</h3>
          <Link to={`/inventory/items/new?categoryId=${encodeURIComponent(id ?? "")}`} className="rounded bg-primary-action px-3 py-1 text-sm text-white">+ Novo item nesta categoria</Link>
        </div>
        <ul className="mt-3 grid gap-2 text-sm">
          {items.map((item) => (
            <li key={item.itemId} className="border-t pt-2">{item.name} — {item.unitSymbol} — {item.requiresExpiration ? "requer validade" : "sem validade"} — {item.isActive ? "ativo" : "inativo"}</li>
          ))}
          {items.length === 0 ? <li className="text-text-muted">Nenhum item nesta categoria</li> : null}
        </ul>
      </div>
    </div>
  );
}
