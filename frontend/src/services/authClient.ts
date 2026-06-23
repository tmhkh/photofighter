/**
 * 共通認証クライアント
 *
 * Cognito Managed Login + OAuth 2.0 Authorization Code (PKCE) フロー。
 * 認証方式はパスキーのみ（Managed Login 側で制御）。
 */

export interface AuthConfig {
  /** Cognito ドメイン URL */
  domain: string;
  /** App Client ID */
  clientId: string;
  /** OAuth コールバック URL */
  redirectUri: string;
  /** ログアウト後のリダイレクト URL */
  logoutUri: string;
  /** OAuth スコープ */
  scopes?: string;
}

const TOKEN_KEY = "idToken";
const PKCE_VERIFIER_KEY = "pkce_verifier";

/**
 * PKCE 用ランダム文字列生成
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

/**
 * PKCE code_verifier から code_challenge を生成 (S256)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 認証設定を環境変数から取得
 */
export function getAuthConfig(): AuthConfig {
  return {
    domain: import.meta.env.VITE_COGNITO_DOMAIN ?? "",
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
    redirectUri: `${window.location.origin}/callback`,
    logoutUri: window.location.origin,
  };
}

/**
 * ログイン: Cognito Managed Login にリダイレクト
 */
export async function login(config?: AuthConfig): Promise<void> {
  const cfg = config ?? getAuthConfig();
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    scope: cfg.scopes ?? "openid email profile",
    redirect_uri: cfg.redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `${cfg.domain}/oauth2/authorize?${params}`;
}

/**
 * コールバック処理: 認可コードをトークンに交換
 */
export async function handleCallback(
  config?: AuthConfig
): Promise<string | null> {
  const cfg = config ?? getAuthConfig();
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!code || !codeVerifier) {
    return null;
  }

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  const res = await fetch(`${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as { id_token: string };
  sessionStorage.setItem(TOKEN_KEY, data.id_token);
  return data.id_token;
}

/**
 * ログアウト: ローカルトークン破棄 + Cognito ログアウトエンドポイントにリダイレクト
 */
export function logout(config?: AuthConfig): void {
  const cfg = config ?? getAuthConfig();
  sessionStorage.removeItem(TOKEN_KEY);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    logout_uri: cfg.logoutUri,
  });
  window.location.href = `${cfg.domain}/logout?${params}`;
}

/**
 * 現在のIDトークンを取得
 */
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * 認証済みかどうか
 */
export function isAuthenticated(): boolean {
  return sessionStorage.getItem(TOKEN_KEY) !== null;
}
