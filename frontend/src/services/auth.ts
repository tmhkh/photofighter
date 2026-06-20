/**
 * Cognito 認証サービス
 *
 * amazon-cognito-identity-js を使い、
 * サインアップ / サインイン / トークン管理を行う。
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || "ap-northeast-1_VNCSv95Dm";
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

function getCognitoUser(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: userPool });
}

/** サインアップ */
export function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    userPool.signUp(email, password, attributes, [], (err) => {
      if (err) {
        reject(new Error(err.message || "登録に失敗しました"));
      } else {
        resolve();
      }
    });
  });
}

/** 確認コード検証 */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = getCognitoUser(email);
    user.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(new Error(err.message || "確認に失敗しました"));
      } else {
        resolve();
      }
    });
  });
}

/** サインイン */
export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = getCognitoUser(email);
    const authDetails = new AuthenticationDetails({
      Username: email,
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
