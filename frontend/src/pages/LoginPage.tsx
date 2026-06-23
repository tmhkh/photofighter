import { login } from "../services/authClient";

/**
 * ログインページ
 *
 * パスキー認証はCognito Managed Loginで行うため、
 * ボタンクリックでリダイレクトする。
 */
export default function LoginPage() {
  const handleLogin = async () => {
    await login();
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "0 auto", textAlign: "center" }}>
      <h2>PhotoFighter</h2>
      <p style={{ color: "#aaa", marginBottom: "32px" }}>パスキーでログインしてください</p>
      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "18px",
          fontWeight: "bold",
          background: "#4fc3f7",
          color: "#000",
          border: "none",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        ログイン
      </button>
    </div>
  );
}
