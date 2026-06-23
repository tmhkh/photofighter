/**
 * API クライアント
 *
 * 認証トークンは共通認証基盤 (authClient) から取得する。
 */

import { getToken, logout } from "./authClient";

export interface Character {
  character_id: string;
  user_id: string;
  name: string;
  sprite_url: string;
  style: string;
  status: "processing" | "completed" | "failed";
  error_message: string;
  created_at: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = getToken();
  if (!token) {
    throw new Error("ログインが必要です");
  }
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response): Promise<never> {
  if (res.status === 401) {
    logout();
    throw new Error("認証エラー: 再ログインしてください");
  }
  let detail = "リクエストに失敗しました";
  try {
    const data = await res.json();
    if (data?.detail) detail = data.detail;
  } catch {
    // JSON でない場合はデフォルトメッセージ
  }
  throw new Error(detail);
}

/** キャラクター生成を開始する（202 で処理中のレコードを返す） */
export async function generateCharacter(file: File): Promise<Character> {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch("/api/characters/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

/** キャラクター詳細を取得する（生成状況のポーリングに使用） */
export async function getCharacter(characterId: string): Promise<Character> {
  const res = await fetch(`/api/characters/${characterId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

/** 自分のキャラクター一覧を取得する */
export async function listCharacters(): Promise<Character[]> {
  const res = await fetch("/api/characters", {
    headers: await authHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

/** キャラクターを削除する */
export async function deleteCharacter(characterId: string): Promise<void> {
  const res = await fetch(`/api/characters/${characterId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) return parseError(res);
}
