import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listCharacters, type Character } from "../services/api";

const STATUS_LABEL: Record<Character["status"], string> = {
  processing: "生成中...",
  completed: "完成",
  failed: "失敗",
};

export default function CharactersPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listCharacters()
      .then((data) => {
        if (active) setCharacters(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>キャラクター一覧</h2>
        <Link to="/characters/create">
          <button style={{ background: "#ffab40", color: "#000" }}>
            + 新規作成
          </button>
        </Link>
      </div>

      {loading && <p style={{ marginTop: "24px", color: "#aaa" }}>読み込み中...</p>}
      {error && <p style={{ marginTop: "24px", color: "#ef5350" }} role="alert">{error}</p>}

      {!loading && !error && characters.length === 0 && (
        <div style={{ marginTop: "24px", color: "#aaa" }}>
          <p>キャラクターがまだありません。写真をアップロードしてキャラクターを作成しましょう！</p>
        </div>
      )}

      <div
        style={{
          marginTop: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "16px",
        }}
      >
        {characters.map((c) => (
          <div
            key={c.character_id}
            onClick={() => navigate(`/characters/${c.character_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate(`/characters/${c.character_id}`);
            }}
            style={{
              border: "1px solid #444",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
              background: "#2a2a4a",
              cursor: "pointer",
              transition: "transform 0.1s",
            }}
          >
            {c.status === "completed" && c.sprite_url ? (
              <img
                src={c.sprite_url}
                alt={c.name}
                style={{ width: "100%", height: "96px", objectFit: "contain", imageRendering: "pixelated" }}
              />
            ) : (
              <div style={{ height: "96px", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                {STATUS_LABEL[c.status]}
              </div>
            )}
            <p style={{ marginTop: "8px", fontSize: "14px" }}>{c.name}</p>
            <p style={{ fontSize: "12px", color: c.status === "failed" ? "#ef5350" : "#888" }}>
              {STATUS_LABEL[c.status]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
