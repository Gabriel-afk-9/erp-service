const API_BASE = "";

function readToken(): string | null {
  return localStorage.getItem("erp_token");
}

function handleUnauthorized(response: Response): void {
  if (response.status === 401) {
    localStorage.removeItem("erp_token");
    if (!window.location.pathname.endsWith("/")) {
      window.location.assign("/");
    }
  }
}

async function request(path: string, options: RequestInit): Promise<unknown> {
  const token = readToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  handleUnauthorized(response);
  return response.json();
}

export async function get(path: string): Promise<unknown> {
  return request(path, { method: "GET" });
}

export async function post(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export async function put(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function patch(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function del(path: string): Promise<unknown> {
  return request(path, { method: "DELETE" });
}
