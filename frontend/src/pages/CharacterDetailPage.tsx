import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCharacter, deleteCharacter, type Character } from "../services/api";

const STATUS_LABEL: Record<Character["status"], string> = {
  processing: "生成中...",
  completed: "完成",
  failed: "失敗",
};

export default function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!characterId) return;
    let active = true;
    const fetchCharacter = async () => {
      try {
        const data = await getCharacter(characterId);
        if (active) setCharacter(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "取得に失敗しました");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCharacter();
    return () => { active = false; };
  }, [characterId]);

  // processing 中はポーリング
  useEffect(() => {
    if (!character || character.status !== "processing") return;
    const interval = setInterval(async () => {
      try {
        const data = await getCharacter(character.character_id);
        setCharacter(data);
        if (data.status !== "processing") clearInterval(interval);
      } catch {
        // ポーリングエラーは無視
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [character?.status, character?.character_id]);

  const handleDelete = async () => {
    if (!character) return;
    if (!window.confirm("このキャラクターを削除しますか？")) return;
    setDeleting(true);
    try {
      await deleteCharacter(character.character_id);
      navigate("/characters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#aaa" }}>
        読み込み中...
      </div>
    );
  }

  if (error || !character) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#ef5350" }} role="alert">{error || "キャラクターが見つかりません"}</p>
        <Link to="/characters" style={{ color: "#ffab40" }}>一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto" }}>
      <Link to="/characters" style={{ color: "#ffab40", textDecoration: "none" }}>
        ← キャラクター一覧
      </Link>

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <h2>{character.name}</h2>
        <p style={{
          fontSize: "14px",
          color: character.status === "failed" ? "#ef5350" : character.status === "processing" ? "#ffab40" : "#66bb6a",
        }}>
          {STATUS_LABEL[character.status]}
        </p>

        {character.status === "completed" && character.sprite_url && (
          <div style={{
            marginTop: "24px",
            padding: "24px",
            background: "#2a2a4a",
            borderRadius: "16px",
            border: "1px solid #444",
          }}>
            <img
              src={character.sprite_url}
              alt={character.name}
              style={{
                maxWidth: "100%",
                maxHeight: "400px",
                objectFit: "contain",
                imageRendering: "pixelated",
              }}
            />
          </div>
        )}

        {character.status === "processing" && (
          <div style={{
            marginTop: "24px",
            padding: "48px",
            background: "#2a2a4a",
            borderRadius: "16px",
            border: "1px solid #444",
            color: "#ffab40",
          }}>
            <p>キャラクターを生成中です...</p>
            <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
              数十秒ほどお待ちください
            </p>
          </div>
        )}

        {character.status === "failed" && (
          <div style={{
            marginTop: "24px",
            padding: "24px",
            background: "#2a2a4a",
            borderRadius: "16px",
            border: "1px solid #ef5350",
            color: "#ef5350",
          }}>
            <p>生成に失敗しました</p>
            {character.error_message && (
              <p style={{ fontSize: "12px", marginTop: "8px" }}>{character.error_message}</p>
            )}
          </div>
        )}

        <div style={{ marginTop: "32px", display: "flex", gap: "12px", justifyContent: "center" }}>
          {character.status === "completed" && (
            <button
              onClick={() => navigate("/game", { state: { characterId: character.character_id } })}
              style={{ background: "#66bb6a", color: "#000" }}
            >
              対戦する
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: "#ef5350", color: "#fff" }}
          >
            {deleting ? "削除中..." : "削除"}
          </button>
        </div>

        <div style={{ marginTop: "24px", fontSize: "12px", color: "#888" }}>
          <p>作成日: {new Date(character.created_at).toLocaleString("ja-JP")}</p>
          <p>スタイル: {character.style}</p>
        </div>
      </div>
    </div>
  );
}
