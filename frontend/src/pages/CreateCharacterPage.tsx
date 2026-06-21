import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateCharacter, getCharacter } from "../services/api";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 4 * 60 * 1000; // 4分

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CreateCharacterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setStatusText("画像をアップロード中...");
    try {
      // 1. 生成開始（202 で処理中レコードが返る）
      const created = await generateCharacter(file);

      // 2. 完了までポーリング
      setStatusText("キャラクターを生成中...");
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const current = await getCharacter(created.character_id);
        if (current.status === "completed") {
          navigate("/characters");
          return;
        }
        if (current.status === "failed") {
          throw new Error(
            current.error_message || "キャラクター生成に失敗しました"
          );
        }
      }
      throw new Error("生成がタイムアウトしました。時間をおいて再度お試しください");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>キャラクター作成</h2>
      <p style={{ color: "#aaa", marginTop: "8px" }}>
        写真をアップロードすると、格闘ゲーム風のキャラクターが生成されます。
      </p>

      <div
        style={{
          marginTop: "24px",
          border: "2px dashed #444",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          cursor: loading ? "default" : "pointer",
        }}
        onClick={() => !loading && fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="プレビュー" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px" }} />
        ) : (
          <p style={{ color: "#888" }}>ここをタップして写真を選択</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          style={{ display: "none" }}
          disabled={loading}
        />
      </div>

      {statusText && (
        <p style={{ color: "#4fc3f7", marginTop: "16px" }} role="status">
          {statusText}
        </p>
      )}
      {error && <p style={{ color: "#ef5350", marginTop: "16px" }} role="alert">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={!file || loading}
        style={{ width: "100%", marginTop: "24px", background: "#ffab40", color: "#000" }}
      >
        {loading ? "生成中..." : "キャラクターを生成"}
      </button>
    </div>
  );
}
