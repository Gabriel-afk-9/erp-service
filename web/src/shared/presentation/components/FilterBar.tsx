import type { ReactNode } from "react";
import { Button } from "./Button.js";

interface FilterBarProps {
  children: ReactNode;
  onSearch: () => void;
  loading?: boolean;
}

// Visible filters stay limited to search plus two or three frequent ones.
export function FilterBar({ children, onSearch, loading }: FilterBarProps) {
  return (
    <div className="mt-md flex flex-wrap items-end gap-sm">
      {children}
      <Button type="button" variant="secondary" onClick={onSearch} disabled={loading}>
        Buscar
      </Button>
    </div>
  );
}
