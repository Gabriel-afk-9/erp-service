import { Link } from "react-router-dom";

const CARDS = [
  { to: "/attendance", label: "ATD — Atendimentos pontuais" },
  { to: "/families", label: "Famílias" },
  { to: "/persons", label: "Pessoas" },
  { to: "/inventory/items", label: "EST — Catálogo" },
  { to: "/inventory/balance", label: "EST — Saldo" },
  { to: "/inventory/receipts", label: "EST — Recebimentos" },
  { to: "/inventory/counts", label: "EST — Contagem" },
  { to: "/inventory/bazar", label: "BAZ — Transferências do Bazar" },
  { to: "/deliveries", label: "ENT — Entregas às famílias" },
  { to: "/reports", label: "REL — Relatórios" },
];

export function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold">ERP Social — Luz da Esperança</h2>
      <div className="mt-4 grid gap-4">
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="rounded bg-white p-4 shadow">
            {card.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
