import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "16px" }}>PhotoFighter</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "40px", color: "#aaa" }}>
        写真からキャラクターを作って戦おう！
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <Link to="/login">
          <button style={{ background: "#4fc3f7", color: "#000", width: "200px" }}>
            ログイン
          </button>
        </Link>
      </div>
    </div>
  );
}
