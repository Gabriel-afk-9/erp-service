import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchFamilies, type FamilyListItem } from "../api/families.api.js";

export function FamiliesPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FamilyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(query: string): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await searchFamilies({ q: query.trim() || undefined });
      setItems(result.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Famílias</h2>
        <Link to="/families/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">
          + Nova família
        </Link>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Buscar por código, nome ou bairro"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(q);
          }}
        />
        <button type="button" onClick={() => void load(q)} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>
          Buscar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-2">Código</th>
              <th className="pr-2">Referência</th>
              <th className="pr-2">Bairro</th>
              <th className="pr-2">Membros</th>
            </tr>
          </thead>
          <tbody>
            {items.map((family) => (
              <tr key={family.familyId} className="border-t">
                <td className="pr-2">
                  <Link to={`/families/${family.familyId}`} className="text-blue-700 underline">
                    {family.code}
                  </Link>
                </td>
                <td className="pr-2">{family.referenceName ?? "—"}</td>
                <td className="pr-2">{family.neighborhood ?? "—"}</td>
                <td className="pr-2">{family.memberCount}</td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  Nenhuma família encontrada
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
