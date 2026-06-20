/**
 * API クライアント
 *
 * Cognito のアクセストークンを Authorization ヘッダに付与してリクエストする。
 */

import { getAccessToken } from "./auth";

const BASE_URL = "/api";

export async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAccessToken();
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
