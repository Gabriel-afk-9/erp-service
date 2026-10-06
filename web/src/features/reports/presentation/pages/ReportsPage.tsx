import { Link } from "react-router-dom";
import { PageHeader } from "../../../../shared/presentation/components/PageHeader.js";

export function ReportsPage() {
  return (
    <div>
      <PageHeader title="Relatórios" />
      <div className="mt-md grid gap-md md:grid-cols-2">
        <Link to="/reports/stock" className="rounded-lg border border-border bg-surface p-md hover:bg-background">
          <h3 className="font-display text-lg font-semibold text-text-strong">Movimentação de estoque</h3>
          <p className="mt-xs font-sans text-sm text-text-muted">Entradas, saídas e saldos por período, item e categoria.</p>
        </Link>
        <Link to="/reports/deliveries" className="rounded-lg border border-border bg-surface p-md hover:bg-background">
          <h3 className="font-display text-lg font-semibold text-text-strong">Entregas por família</h3>
          <p className="mt-xs font-sans text-sm text-text-muted">Quem recebeu o quê, quando e em que quantidade.</p>
        </Link>
      </div>
    </div>
  );
}
