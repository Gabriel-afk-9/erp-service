import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { searchPersons, type PersonListItem } from "../api/persons.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

const PAGE_SIZE = 20;

export function PersonsPage() {
  const [q, setQ] = useState("");
  const [cpf, setCpf] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PersonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(query: string, cpfFilter: string, targetPage: number): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      const trimmed = query.trim();
      const result = await searchPersons({
        cpf: cpfFilter.trim() || undefined,
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
        <h2 className="text-xl font-bold">Pessoas</h2>
        <Link to="/persons/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">
          + Cadastrar nova pessoa
        </Link>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Buscar por nome ou CPF (mín. 2 letras)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(q, cpf, 1);
          }}
        />
        <input
          className="w-48 rounded border px-3 py-2"
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(q, cpf, 1);
          }}
        />
        <button type="button" onClick={() => void load(q, cpf, 1)} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>
          Buscar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <DataTable
          columns={[
            { key: "name", label: "Nome" },
            { key: "birthDate", label: "Nascimento", render: (row) => formatDate((row as PersonListItem).birthDate) },
            { key: "currentFamilyCode", label: "Família atual", render: (row) => (row as PersonListItem).currentFamilyCode ?? "—" },
            { key: "actions", label: "Ações", render: (row) => <Link to={`/persons/${(row as PersonListItem).personId}`} className="text-blue-700 underline">Ver</Link> },
          ]}
          rows={items}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={(next) => void load(q, cpf, next)}
          loading={loading}
          emptyMessage="Nenhuma pessoa encontrada"
        />
      </div>
    </div>
  );
}
