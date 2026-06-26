import { useAuth } from "../contexts/AuthContext";

/**
 * ログインページ
 *
 * パスキー認証用: ボタンクリックで Cognito Managed Login にリダイレクト
 */
export default function LoginPage() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    await login();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>PhotoFighter</h1>
      <p style={styles.subtitle}>パスキーでログインしてください</p>
      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        onClick={handleLogin}
        style={styles.button}
        disabled={isLoading}
        aria-label="ログイン"
      >
        {isLoading ? "リダイレクト中..." : "ログイン"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "24px",
    gap: "16px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#aaa",
    marginBottom: "24px",
  },
  error: {
    color: "#ef5350",
    fontSize: "14px",
    margin: 0,
    textAlign: "center",
  },
  button: {
    padding: "16px 48px",
    fontSize: "18px",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#4fc3f7",
    color: "#000",
    cursor: "pointer",
  },
};
