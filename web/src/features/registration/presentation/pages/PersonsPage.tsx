import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { FilterBar } from "../../../../shared/presentation/components/FilterBar.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
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
      <PageHeader
        title="Pessoas"
        actions={
          <Link to="/persons/new">
            <Button variant="primary">Cadastrar pessoa</Button>
          </Link>
        }
      />
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <FilterBar onSearch={() => void load(q, cpf, 1)} loading={loading}>
          <label className="flex min-w-0 flex-1 flex-col gap-xs font-sans text-sm font-semibold text-text">
            Buscar
            <input
              className="field-input font-normal"
              placeholder="Buscar por nome (mín. 2 letras)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q, cpf, 1);
              }}
            />
          </label>
          <label className="flex w-48 flex-col gap-xs font-sans text-sm font-semibold text-text">
            CPF
            <input
              className="field-input font-mono font-normal"
              placeholder="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q, cpf, 1);
              }}
            />
          </label>
        </FilterBar>
      </div>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <DataTable
          columns={[
            { key: "name", label: "Nome" },
            { key: "birthDate", label: "Nascimento", render: (row) => <span className="font-mono text-xs">{formatDate((row as PersonListItem).birthDate)}</span> },
            { key: "currentFamilyCode", label: "Família atual", render: (row) => <span className="font-mono text-xs">{(row as PersonListItem).currentFamilyCode ?? "—"}</span> },
            { key: "actions", label: "Ações", render: (row) => <Link to={`/persons/${(row as PersonListItem).personId}`} className="font-sans text-sm font-semibold text-primary-action underline">Ver</Link> },
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
