/**
 * Cognito 認証サービス
 *
 * amazon-cognito-identity-js を使い、
 * アカウント名（ユーザー名）でのサインイン / トークン管理を行う。
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || "ap-northeast-1_VNCSv95Dm";
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

function getCognitoUser(username: string): CognitoUser {
  return new CognitoUser({ Username: username, Pool: userPool });
}

/** サインイン（アカウント名 + パスワード） */
export function signIn(username: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = getCognitoUser(username);
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(new Error(err.message || "ログインに失敗しました")),
    });
  });
}

/** サインアウト */
export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
}

/** 現在の有効なセッションを取得 */
export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
      } else {
        resolve(session);
      }
    });
  });
}

/** アクセストークンを取得（API リクエスト用） */
export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.getAccessToken().getJwtToken() ?? null;
}

/** ログイン状態を確認 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null && session.isValid();
}
