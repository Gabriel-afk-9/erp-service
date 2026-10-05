import type { ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Second disclosure level for history, audit and evidence.
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-text-strong/40 backdrop-blur-[4px]" onClick={onClose}>
      <aside
        className="h-full w-full max-w-[480px] overflow-auto rounded-l-lg border border-secondary-border bg-surface p-lg shadow-[0_12px_32px_-4px_rgba(60,48,30,0.12)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-md flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text-strong">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-surface px-sm py-xs font-sans text-sm text-text-strong"
          >
            Fechar
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
