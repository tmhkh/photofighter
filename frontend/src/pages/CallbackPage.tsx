import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

/**
 * OAuth コールバックページ
 *
 * Cognito Managed Login からのリダイレクトを受けて
 * 認可コードをトークンに交換し、メインページに遷移する。
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const processCallback = async () => {
      const token = await authService.handleCallback();
      if (token) {
        navigate("/characters", { replace: true });
      } else {
        setError("認証に失敗しました");
      }
    };
    processCallback();
  }, [navigate]);

  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#ef5350" }}>{error}</p>
        <button onClick={() => navigate("/login")}>ログインに戻る</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <p>認証処理中...</p>
    </div>
  );
}
