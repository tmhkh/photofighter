import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

export default function LoginPage() {
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
      await authService.login(email, password);
      navigate("/characters");
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>ログイン</h2>
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
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #444", background: "#2a2a4a", color: "#eee" }}
          />
        </div>
        {error && <p style={{ color: "#ef5350", marginBottom: "16px" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", background: "#4fc3f7", color: "#000" }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
