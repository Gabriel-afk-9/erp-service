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
        <div key={line.key} className="mb-sm rounded-md border border-border bg-surface p-md">
          <div className="mb-sm flex items-center justify-between">
            <span className="font-sans text-sm font-semibold text-text-strong">Linha {index + 1}</span>
            <button
              type="button"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              className="font-sans text-sm text-aptIneligibleText underline"
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
        className="inline-flex h-[40px] items-center rounded-md border border-border bg-surface px-md font-sans text-sm font-semibold text-text-strong hover:bg-background"
      >
        {addLabel}
      </button>
    </div>
  );
}
