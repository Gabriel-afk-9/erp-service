import type { ReactNode } from "react";
import { Button } from "./Button.js";
import { EmptyState } from "./EmptyState.js";

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, page, pageSize, total, onPageChange, loading, emptyMessage }: DataTableProps<T>) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <table className="w-full font-sans text-sm text-text">
        <thead>
          <tr className="border-b-2 border-secondary-border bg-tableHeader text-left">
            {columns.map((column) => (
              <th key={column.key} className="px-md py-sm font-sans text-sm font-bold text-secondary-dark">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {rows.map((row, index) => (
            <tr key={`${page}-${index}`} className="border-b border-border hover:bg-background">
              {columns.map((column) => (
                <td key={column.key} className="px-md py-sm">
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && !loading ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyMessage ?? "Nenhum registro encontrado"} />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="mt-md flex items-center justify-between font-sans text-sm">
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {loading ? "Carregando..." : `Mostrando ${start}–${end} de ${total} registros`}
        </span>
        <div className="flex gap-sm">
          <Button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
