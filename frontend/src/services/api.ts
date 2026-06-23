/**
 * API クライアント
 *
 * 認証トークンは共通認証基盤 (authClient) から取得する。
 */

import { getToken, login, logout, isAuthenticated, handleCallback } from "./authClient";

const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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
  if (res.status === 401) {
    // 認証エラー時はログイン画面にリダイレクト
    logout();
    return Promise.reject(new Error("認証エラー"));
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

/**
 * 認証サービス (共通認証基盤ベース)
 */
export const authService = {
  login,
  logout,
  isLoggedIn: isAuthenticated,
  handleCallback,
};

/**
 * キャラクター API
 */
export const characterApi = {
  async getAll(): Promise<unknown[]> {
    return request<unknown[]>("/characters");
  },

  async create(formData: FormData): Promise<unknown> {
    return request<unknown>("/characters", {
      method: "POST",
      body: formData,
    });
  },

  async get(characterId: string): Promise<unknown> {
    return request<unknown>(`/characters/${characterId}`);
  },
};

/**
 * ゲーム API
 */
export const gameApi = {
  async start(characterId: string, opponentId: string): Promise<unknown> {
    return request<unknown>("/game/start", {
      method: "POST",
      body: JSON.stringify({ character_id: characterId, opponent_id: opponentId }),
    });
  },
};

export { request };
