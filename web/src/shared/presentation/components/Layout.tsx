import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/dashboard", label: "Painel", icon: "dashboard" },
  { to: "/families", label: "Famílias", icon: "group" },
  { to: "/persons", label: "Pessoas", icon: "person" },
  { to: "/attendance", label: "Atendimentos", icon: "support_agent" },
  { to: "/inventory/items", label: "Catálogo", icon: "category" },
  { to: "/inventory/receipts", label: "Recebimentos", icon: "move_to_inbox" },
  { to: "/inventory/balance", label: "Saldo", icon: "inventory_2" },
  { to: "/inventory/counts", label: "Contagem", icon: "checklist" },
  { to: "/inventory/bazar", label: "Bazar", icon: "store" },
  { to: "/deliveries", label: "Entregas", icon: "volunteer_activism" },
  { to: "/reports", label: "Relatórios", icon: "bar_chart" },
];

export function Layout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout(): void {
    localStorage.removeItem("erp_token");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <div className="flex min-h-screen">
        <aside className={`${collapsed ? "w-[64px]" : "w-[220px]"} shrink-0 bg-surface-low shadow-[0_1px_8px_rgba(92,75,50,0.06)]`}>
          <div className="flex min-h-[76px] items-center justify-between px-md py-sm">
            {collapsed ? (
              <img alt="Luz da Esperança" className="h-10 w-10 rounded object-cover object-top" src="/images/logo.png" />
            ) : (
              <img
                alt="Luz da Esperança - Centro Espírita e Obras Sociais"
                className="h-16 w-auto max-w-[170px] shrink-0 object-contain"
                src="/images/logo.png"
              />
            )}
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
              className="rounded-md border border-border p-xs text-text-muted hover:text-text-strong"
            >
              <span className="material-symbols-outlined text-[18px]">{collapsed ? "menu_open" : "menu"}</span>
            </button>
          </div>
          <nav className="flex flex-col gap-xs px-sm pb-md">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-sm rounded-lg px-sm py-sm font-sans text-sm font-semibold transition-colors ${
                    isActive ? "bg-primary-soft text-primary-action shadow-sm" : "text-text hover:bg-surface hover:text-text-strong"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed ? item.label : null}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[56px] items-center justify-between border-b border-border bg-surface px-lg">
            <span className="font-sans text-sm text-text-muted">Gestão Social · Parnaíba (PI)</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-border bg-surface px-md py-sm font-sans text-sm font-semibold text-text-strong hover:bg-background"
            >
              Sair
            </button>
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 p-lg">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
