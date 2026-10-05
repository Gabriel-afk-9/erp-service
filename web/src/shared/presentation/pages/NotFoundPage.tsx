import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";

export function NotFoundPage() {
  return (
    <div className="bg-background">
      <PageHeader title="Página não encontrada" />
      <p className="mt-sm font-sans text-sm text-text-muted">O endereço acessado não existe.</p>
      <Link to="/dashboard" className="mt-md inline-block font-sans text-sm font-semibold text-primary-action underline">
        Voltar ao painel
      </Link>
    </div>
  );
}
