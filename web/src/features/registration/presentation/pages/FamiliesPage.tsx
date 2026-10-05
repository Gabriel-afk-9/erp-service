import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../../shared/presentation/components/DataTable.js";
import { Alert } from "../../../../shared/presentation/components/Alert.js";
import { Button } from "../../../../shared/presentation/components/Button.js";
import { FilterBar } from "../../../../shared/presentation/components/FilterBar.js";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";
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
      <PageHeader
        title="Pessoas e famílias"
        actions={
          <Link to="/families/new">
            <Button variant="primary">Cadastrar família</Button>
          </Link>
        }
      />
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <FilterBar onSearch={() => void load(q, code, 1)} loading={loading}>
          <label className="flex min-w-0 flex-1 flex-col gap-xs font-sans text-sm font-semibold text-text">
            Buscar
            <input
              className="field-input font-normal"
              placeholder="Buscar por código, nome ou bairro"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q, code, 1);
              }}
            />
          </label>
          <label className="flex w-48 flex-col gap-xs font-sans text-sm font-semibold text-text">
            Código
            <input
              className="field-input font-mono font-normal"
              placeholder="Código exato"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q, code, 1);
              }}
            />
          </label>
        </FilterBar>
      </div>
      {feedback ? <Alert tone="error" message={feedback} /> : null}
      <div className="mt-md rounded-lg border border-border bg-surface p-md">
        <DataTable
          columns={[
            { key: "code", label: "Código", render: (row) => <Link to={`/families/${(row as FamilyListItem).familyId}`} className="font-mono text-xs text-primary-action underline">{(row as FamilyListItem).code}</Link> },
            { key: "referenceName", label: "Referência", render: (row) => (row as FamilyListItem).referenceName ?? "—" },
            { key: "neighborhood", label: "Bairro", render: (row) => (row as FamilyListItem).neighborhood ?? "—" },
            { key: "memberCount", label: "Membros", render: (row) => <span className="font-mono">{String((row as FamilyListItem).memberCount)}</span> },
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
