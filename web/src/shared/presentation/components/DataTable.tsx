import type { ReactNode } from "react";

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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {columns.map((column) => (
              <th key={column.key} className="pr-2">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${page}-${index}`} className="border-t">
              {columns.map((column) => (
                <td key={column.key} className="pr-2">
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && !loading ? (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-gray-500">
                {emptyMessage ?? "Nenhum registro encontrado"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {loading ? "Carregando..." : `Mostrando ${start}–${end} de ${total} registros`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
