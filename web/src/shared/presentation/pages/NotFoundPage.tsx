import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div>
      <h2 className="text-xl font-bold">Página não encontrada</h2>
      <p className="mt-2 text-sm text-gray-600">O endereço acessado não existe.</p>
      <Link to="/dashboard" className="mt-4 inline-block text-sm text-blue-700 underline">
        Voltar ao painel
      </Link>
    </div>
  );
}
