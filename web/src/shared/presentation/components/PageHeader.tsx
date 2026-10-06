import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

// Single page title in display type; layout already explains the task.
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-md">
      <h2 className="font-display text-[2rem] font-semibold leading-[1.2] text-text-strong">{title}</h2>
      {actions ? <div className="flex shrink-0 items-center gap-sm">{actions}</div> : null}
    </div>
  );
}
