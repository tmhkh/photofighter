import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signUp, confirmSignUp, signIn } from "../services/auth";

type Step = "register" | "confirm";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUp(email, password);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await confirmSignUp(email, code);
      // 確認後に自動ログイン
      await signIn(email, password);
      navigate("/characters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (step === "confirm") {
    return (
      <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>メール確認</h2>
        <p style={{ marginTop: "8px", color: "#aaa" }}>
          {email} に送信された確認コードを入力してください
        </p>
        <form onSubmit={handleConfirm} style={{ marginTop: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="確認コード（6桁）"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              aria-label="確認コード"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #444", background: "#2a2a4a", color: "#eee", letterSpacing: "4px", textAlign: "center", fontSize: "1.2rem" }}
            />
          </div>
          {error && <p style={{ color: "#ef5350", marginBottom: "16px" }} role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: "#66bb6a", color: "#000" }}
          >
            {loading ? "確認中..." : "確認して開始"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>新規登録</h2>
      <form onSubmit={handleRegister} style={{ marginTop: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="メールアドレス"
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #444", background: "#2a2a4a", color: "#eee" }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <input
            type="password"
            placeholder="パスワード（8文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            aria-label="パスワード"
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #444", background: "#2a2a4a", color: "#eee" }}
          />
        </div>
        {error && <p style={{ color: "#ef5350", marginBottom: "16px" }} role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", background: "#66bb6a", color: "#000" }}
        >
          {loading ? "登録中..." : "アカウント作成"}
        </button>
      </form>
      <p style={{ marginTop: "16px", textAlign: "center" }}>
        <Link to="/login" style={{ color: "#4fc3f7" }}>ログインはこちら</Link>
      </p>
    </div>
  );
}
