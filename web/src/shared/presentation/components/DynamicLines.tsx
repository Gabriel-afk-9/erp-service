import type { ReactNode } from "react";

export interface LineItem {
  key: string;
}

interface DynamicLinesProps<T extends LineItem> {
  lines: T[];
  onChange: (lines: T[]) => void;
  renderLine: (line: T, index: number, onChange: (line: T) => void) => ReactNode;
  addLabel: string;
  createLine: () => T;
}

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `line-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function createLineKey(): string {
  return newKey();
}

export function DynamicLines<T extends LineItem>({ lines, onChange, renderLine, addLabel, createLine }: DynamicLinesProps<T>) {
  return (
    <div>
      {lines.map((line, index) => (
        <div key={line.key} className="mb-2 rounded border p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium">Linha {index + 1}</span>
            <button
              type="button"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              className="text-sm text-red-700 underline"
            >
              Remover
            </button>
          </div>
          {renderLine(line, index, (updated) => onChange(lines.map((current, i) => (i === index ? updated : current))))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...lines, createLine()])}
        className="rounded bg-gray-200 px-4 py-2 text-sm"
      >
        {addLabel}
      </button>
    </div>
  );
}
