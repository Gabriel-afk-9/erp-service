import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { searchFamilies, type FamilyListItem } from "../api/families.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";

const PAGE_SIZE = 20;

export function FamiliesPage() {
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FamilyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(query: string, familyCode: string, targetPage: number): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      const trimmed = query.trim();
      const result = await searchFamilies({
        code: familyCode.trim() || undefined,
        page: targetPage,
        pageSize: PAGE_SIZE,
        q: trimmed === "" ? undefined : trimmed,
      });
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("", "", 1);
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
            if (e.key === "Enter") void load(q, code, 1);
          }}
        />
        <input
          className="w-48 rounded border px-3 py-2"
          placeholder="Código exato"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(q, code, 1);
          }}
        />
        <button type="button" onClick={() => void load(q, code, 1)} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>
          Buscar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <DataTable
          columns={[
            { key: "code", label: "Código", render: (row) => <Link to={`/families/${(row as FamilyListItem).familyId}`} className="text-blue-700 underline">{(row as FamilyListItem).code}</Link> },
            { key: "referenceName", label: "Referência", render: (row) => (row as FamilyListItem).referenceName ?? "—" },
            { key: "neighborhood", label: "Bairro", render: (row) => (row as FamilyListItem).neighborhood ?? "—" },
            { key: "memberCount", label: "Membros", render: (row) => String((row as FamilyListItem).memberCount) },
          ]}
          rows={items}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={(next) => void load(q, code, next)}
          loading={loading}
          emptyMessage="Nenhuma família encontrada"
        />
      </div>
    </div>
  );
}
