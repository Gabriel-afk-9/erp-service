import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { get } from "../../application/api-client.js";

export function PrivateRoute() {
  const [state, setState] = useState<"checking" | "valid" | "invalid">("checking");

  useEffect(() => {
    async function validate(): Promise<void> {
      const token = localStorage.getItem("erp_token");
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        await get("/auth/me");
        setState("valid");
      } catch {
        localStorage.removeItem("erp_token");
        setState("invalid");
      }
    }
    void validate();
  }, []);

  if (state === "checking") {
    return <p className="bg-background p-md font-sans text-sm text-text-muted">Verificando sessão...</p>;
  }
  if (state === "invalid") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
