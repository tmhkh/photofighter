/**
 * API クライアント
 */

const BASE_URL = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!headers["Content-Type"] && !(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const data = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
  },

  async register(email: string, password: string): Promise<void> {
    const data = await request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
  },

  logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem("access_token");
  },
};
