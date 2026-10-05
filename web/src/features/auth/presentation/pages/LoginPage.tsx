import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../../../../shared/application/api-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-md font-sans">
      <div className="flex w-full max-w-[380px] flex-col items-center rounded-xl bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <img alt="Luz da Esperança" className="mb-3 h-20 w-20 object-contain" src="/images/logo.png" />
          <h1 className="text-center font-display text-[22px] font-semibold leading-[30px] text-text-strong">
            Gestão Social
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-1.5">
            <label className="font-sans text-sm font-semibold text-text" htmlFor="login-user">
              Login
            </label>
            <input
              id="login-user"
              autoComplete="username"
              required
              className="h-[44px] w-full rounded-lg bg-surface-low px-3.5 font-sans text-base text-text shadow-sm outline-none transition-colors placeholder:text-text-muted focus:bg-surface focus:ring-2 focus:ring-primary-container"
              placeholder="Digite seu usuário ou e-mail"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <label className="font-sans text-sm font-semibold text-text" htmlFor="login-pass">
              Senha
            </label>
            <div className="relative flex w-full items-center">
              <input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="h-[44px] w-full rounded-lg bg-surface-low py-sm pl-3.5 pr-11 font-sans text-base text-text shadow-sm outline-none transition-colors placeholder:text-text-muted focus:bg-surface focus:ring-2 focus:ring-primary-container"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2.5 flex items-center justify-center rounded p-1.5 text-text-muted transition-colors hover:text-text-strong"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-coral bg-aptIneligibleBg px-md py-sm font-sans text-sm text-aptIneligibleText">
              {error}
            </p>
          ) : null}
          <div className="w-full pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-lg bg-primary-container font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
          <div className="w-full pt-1 text-center">
            <span className="font-sans text-base text-secondary underline-offset-2 hover:underline">
              Precisa de ajuda para acessar?
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
