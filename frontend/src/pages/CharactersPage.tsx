import { Link } from "react-router-dom";

export default function CharactersPage() {
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
      <div style={{ marginTop: "24px", color: "#aaa" }}>
        <p>キャラクターがまだありません。写真をアップロードしてキャラクターを作成しましょう！</p>
      </div>
    </div>
  );
}
