interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
}

export function EmptyState({ icon = "inbox", title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-xs py-xl text-center">
      <span className="material-symbols-outlined text-[28px] text-text-muted" aria-hidden="true">
        {icon}
      </span>
      <p className="font-sans text-sm font-semibold text-text-strong">{title}</p>
      {hint ? <p className="max-w-md font-sans text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}
