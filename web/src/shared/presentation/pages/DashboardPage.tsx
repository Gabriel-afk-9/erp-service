import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold">ERP Social — Luz da Esperança</h2>
      <div className="mt-4 grid gap-4">
        <Link to="/families" className="rounded bg-white p-4 shadow">
          CAD — Famílias e vínculos
        </Link>
        <Link to="/persons" className="rounded bg-white p-4 shadow">
          CAD — Pessoas
        </Link>
        <Link to="/attendance" className="rounded bg-white p-4 shadow">
          ATD — Atendimentos pontuais
        </Link>
        <Link to="/inventory/items" className="rounded bg-white p-4 shadow">
          EST — Estoque (catálogo)
        </Link>
        <Link to="/deliveries" className="rounded bg-white p-4 shadow">
          ENT — Entregas às famílias
        </Link>
        <Link to="/inventory/bazar" className="rounded bg-white p-4 shadow">
          BAZ — Transferências do Bazar
        </Link>
        <Link to="/reports" className="rounded bg-white p-4 shadow">
          REL — Relatórios de estoque e entregas
        </Link>
      </div>
    </div>
  );
}
