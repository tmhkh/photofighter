import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Phaser from "phaser";
import { getCharacter } from "../services/api";
import { getToken } from "../services/authClient";
import { createBattleScene } from "../game/scenes/BattleScene";
import { createBootScene } from "../game/scenes/BootScene";
import { ResultScene } from "../game/scenes/ResultScene";

export default function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const characterId = (location.state as { characterId?: string })?.characterId;

  useEffect(() => {
    if (!characterId) {
      setError("キャラクターが選択されていません");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initGame = async () => {
      try {
        const character = await getCharacter(characterId);
        if (cancelled) return;

        if (character.status !== "completed" || !character.sprite_url) {
          setError("キャラクターがまだ完成していません");
          setLoading(false);
          return;
        }

        // 認証付きで画像を取得し、blob URL に変換
        const token = getToken();
        const imageRes = await fetch(`/api/characters/${characterId}/image`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!imageRes.ok) {
          setError("キャラクター画像の取得に失敗しました");
          setLoading(false);
          return;
        }
        const blob = await imageRes.blob();
        const blobUrl = URL.createObjectURL(blob);

        // 鬼のスプライトシートも取得
        const enemyRes = await fetch(`/api/characters/enemy/oni/spritesheet`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let enemyBlobUrl = "";
        if (enemyRes.ok) {
          const enemyBlob = await enemyRes.blob();
          enemyBlobUrl = URL.createObjectURL(enemyBlob);
        }

        if (cancelled || !containerRef.current || gameRef.current) {
          URL.revokeObjectURL(blobUrl);
          if (enemyBlobUrl) URL.revokeObjectURL(enemyBlobUrl);
          return;
        }

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: containerRef.current,
          width: 800,
          height: 600,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          physics: {
            default: "arcade",
            arcade: {
              gravity: { x: 0, y: 800 },
              debug: false,
            },
          },
          scene: [
            createBootScene(blobUrl, enemyBlobUrl),
            createBattleScene(),
            ResultScene,
          ],
          input: {
            activePointers: 3,
          },
        };

        gameRef.current = new Phaser.Game(config);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "ゲーム初期化に失敗しました");
          setLoading(false);
        }
      }
    };

    initGame();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [characterId]);

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#ef5350" }}>{error}</p>
        <button onClick={() => navigate("/characters")} style={{ marginTop: "16px", background: "#ffab40", color: "#000" }}>
          キャラクター一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#000", position: "relative" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
          読み込み中...
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    </div>
  );
}
