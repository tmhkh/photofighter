import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BattleScene } from "../game/scenes/BattleScene";
import { BootScene } from "../game/scenes/BootScene";
import { ResultScene } from "../game/scenes/ResultScene";

export default function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

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
      scene: [BootScene, BattleScene, ResultScene],
      input: {
        activePointers: 3,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    />
  );
}
