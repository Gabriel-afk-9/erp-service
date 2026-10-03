import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../../../../shared/application/api-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = (await post("/auth/login", { login, password })) as {
        data?: { token?: string };
      };
      const token = result.data?.token;
      if (!token) {
        setError("Credenciais inválidas");
        return;
      }
      // localStorage por conveniencia do prototipo — producao usaria httpOnly cookie.
      localStorage.setItem("erp_token", token);
      navigate("/dashboard");
    } catch {
      setError("Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-80 rounded bg-white p-6 shadow">
        <h1 className="mb-4 text-lg font-semibold">Entrar</h1>
        <label className="mb-2 block text-sm">
          Login
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>
        <label className="mb-4 block text-sm">
          Senha
          <input
            type="password"
            className="mt-1 w-full rounded border px-2 py-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-800 px-4 py-2 text-white"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
