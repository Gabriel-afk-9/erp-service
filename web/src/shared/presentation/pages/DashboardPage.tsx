import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { Button } from "../components/Button.js";

const QUICK_ACTIONS = [
  { to: "/families/new", label: "Cadastrar família", icon: "person_add", primary: true },
  { to: "/attendance", label: "Registrar atendimento", icon: "support_agent", primary: false },
  { to: "/inventory/receipts/new", label: "Registrar recebimento", icon: "move_to_inbox", primary: false },
  { to: "/deliveries/new", label: "Nova entrega", icon: "volunteer_activism", primary: false },
];

const MODULES = [
  { to: "/attendance", label: "Atendimentos pontuais", hint: "Visitas domiciliares incluídas" },
  { to: "/families", label: "Famílias", hint: "Cadastro e vínculos" },
  { to: "/persons", label: "Pessoas", hint: "Cadastro individual" },
  { to: "/inventory/items", label: "Catálogo", hint: "Itens, categorias e unidades" },
  { to: "/inventory/balance", label: "Saldo", hint: "Disponibilidade por lote" },
  { to: "/inventory/receipts", label: "Recebimentos", hint: "Entradas e triagem" },
  { to: "/inventory/counts", label: "Contagem", hint: "Ajustes de estoque" },
  { to: "/inventory/bazar", label: "Bazar", hint: "Transferências ao social" },
  { to: "/deliveries", label: "Entregas", hint: "Entregas às famílias" },
  { to: "/reports", label: "Relatórios", hint: "Estoque e entregas" },
];

export function DashboardPage() {
  return (
    <div>
      <PageHeader title="Painel" />
      <section aria-label="Ações rápidas" className="mt-md flex flex-wrap items-center gap-sm rounded-lg bg-surface p-md shadow-sm">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} to={action.to}>
            <Button variant={action.primary ? "primary" : "secondary"}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {action.icon}
              </span>
              {action.label}
            </Button>
          </Link>
        ))}
      </section>
      <div className="mt-lg grid gap-md md:grid-cols-2">
        {MODULES.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-lg border border-border bg-surface p-md hover:bg-background"
          >
            <h3 className="font-display text-lg font-semibold text-text-strong">{card.label}</h3>
            <p className="mt-xs font-sans text-sm text-text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
