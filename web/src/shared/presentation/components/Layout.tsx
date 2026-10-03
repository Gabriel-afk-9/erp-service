import { Outlet, useNavigate } from "react-router-dom";

export function Layout() {
  const navigate = useNavigate();

  function handleLogout(): void {
    localStorage.removeItem("erp_token");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
        <h1 className="text-lg font-semibold">ERP Social — Luz da Esperança</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded bg-gray-800 px-4 py-2 text-sm text-white"
        >
          Sair
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
