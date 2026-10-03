import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold">ERP Social — Luz da Esperança</h2>
      <div className="mt-4 grid gap-4">
        <Link to="/families" className="rounded bg-white p-4 shadow">
          CAD — Famílias e vínculos
        </Link>
        <Link to="/attendance" className="rounded bg-white p-4 shadow">
          ATD — Atendimentos pontuais
        </Link>
        <div className="rounded bg-white p-4 shadow">EST — Em implementação</div>
        <div className="rounded bg-white p-4 shadow">ENT — Em implementação</div>
        <div className="rounded bg-white p-4 shadow">BAZ — Em implementação</div>
      </div>
    </div>
  );
}
