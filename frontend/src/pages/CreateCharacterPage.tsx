import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateCharacterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/characters/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "生成に失敗しました");
      }
      navigate("/characters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
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
          cursor: "pointer",
        }}
        onClick={() => fileInputRef.current?.click()}
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
        />
      </div>

      {error && <p style={{ color: "#ef5350", marginTop: "16px" }}>{error}</p>}

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
