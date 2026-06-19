import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.register(email, password);
      navigate("/characters");
    } catch {
      setError("登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>新規登録</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #444", background: "#2a2a4a", color: "#eee" }}
          />
        </div>
        {error && <p style={{ color: "#ef5350", marginBottom: "16px" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", background: "#66bb6a", color: "#000" }}
        >
          {loading ? "登録中..." : "アカウント作成"}
        </button>
      </form>
    </div>
  );
}
