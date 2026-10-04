import { Link } from "react-router-dom";

export function ReportsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold">Relatórios</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Link to="/reports/stock" className="rounded bg-white p-4 shadow">
          <h3 className="font-bold">Movimentação de estoque (REL-05)</h3>
          <p className="text-sm text-gray-600">Entradas, saídas e saldos por período, item e categoria.</p>
        </Link>
        <Link to="/reports/deliveries" className="rounded bg-white p-4 shadow">
          <h3 className="font-bold">Entregas por família (REL-06)</h3>
          <p className="text-sm text-gray-600">Quem recebeu o quê, quando e em que quantidade.</p>
        </Link>
      </div>
    </div>
  );
}
