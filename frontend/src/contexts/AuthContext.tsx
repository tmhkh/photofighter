import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import * as authClient from "../services/authClient";

/**
 * 認証設定を環境変数から取得
 */
function getAuthConfig(): authClient.AuthConfig {
  return {
    domain: import.meta.env.VITE_COGNITO_DOMAIN ?? "",
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
    redirectUri: `${window.location.origin}/callback`,
    logoutUri: window.location.origin,
  };
}

/**
 * AuthContext が提供する値
 */
export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  idToken: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider - OAuth PKCE 認証状態管理
 *
 * - Cognito Managed Login にリダイレクトしてパスキー認証
 * - コールバック時に自動トークン交換
 * - IDトークンをセッションストレージに保持
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // OAuth コールバック URL の場合はトークン交換
      if (authClient.isCallbackUrl()) {
        try {
          const config = getAuthConfig();
          const token = await authClient.handleCallback(config);
          if (token) {
            window.history.replaceState({}, "", window.location.pathname);
            setIsAuthenticated(true);
            setIdToken(token);
            setIsLoading(false);
            return;
          }
        } catch {
          // コールバック処理失敗
        }
        setError("認証に失敗しました");
        setIsLoading(false);
        return;
      }

      // 既存セッション確認
      const storedToken = authClient.getToken();
      if (storedToken) {
        setIsAuthenticated(true);
        setIdToken(storedToken);
      }
      setIsLoading(false);
    };

    initialize();
  }, []);

  const login = useCallback(async () => {
    const config = getAuthConfig();
    await authClient.login(config);
  }, []);

  const logout = useCallback(() => {
    const config = getAuthConfig();
    authClient.logout(config);
  }, []);

  const getToken = useCallback((): string | null => {
    return authClient.getToken();
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    idToken,
    error,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth カスタムフック
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth は AuthProvider 内で使用してください");
  }
  return context;
}
