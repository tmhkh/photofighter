import Phaser from "phaser";

/**
 * BootScene ファクトリ: プレイヤー/敵キャラクター画像（スプライトシート blob URL）を受け取る。
 *
 * スプライトシート構成: 640x192 (5フレーム x 128x192)
 * [0] idle [1] punch [2] kick [3] jump [4] guard
 */
export function createBootScene(playerImageBlobUrl: string, enemyImageBlobUrl: string) {
  return class BootScene extends Phaser.Scene {
    constructor() {
      super({ key: "BootScene" });
    }

    preload(): void {
      const { width, height } = this.cameras.main;
      const progressBar = this.add.graphics();
      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x222222, 0.8);
      progressBox.fillRect(width / 4, height / 2 - 15, width / 2, 30);

      this.load.on("progress", (value: number) => {
        progressBar.clear();
        progressBar.fillStyle(0x4fc3f7, 1);
        progressBar.fillRect(
          width / 4 + 5,
          height / 2 - 10,
          (width / 2 - 10) * value,
          20
        );
      });

      this.load.on("complete", () => {
        progressBar.destroy();
        progressBox.destroy();
      });

      // プレイヤースプライトシート
      this.load.spritesheet("player-sprite", playerImageBlobUrl, {
        frameWidth: 128,
        frameHeight: 192,
      });

      // 敵スプライトシート
      if (enemyImageBlobUrl) {
        this.load.spritesheet("enemy-sprite", enemyImageBlobUrl, {
          frameWidth: 128,
          frameHeight: 192,
        });
      }
    }

    create(): void {
      // プレイヤーアニメーション
      this.anims.create({
        key: "player-idle",
        frames: [{ key: "player-sprite", frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
      this.anims.create({
        key: "player-punch",
        frames: [{ key: "player-sprite", frame: 1 }],
        frameRate: 1,
        repeat: 0,
      });
      this.anims.create({
        key: "player-kick",
        frames: [{ key: "player-sprite", frame: 2 }],
        frameRate: 1,
        repeat: 0,
      });
      this.anims.create({
        key: "player-jump",
        frames: [{ key: "player-sprite", frame: 3 }],
        frameRate: 1,
        repeat: 0,
      });
      this.anims.create({
        key: "player-guard",
        frames: [{ key: "player-sprite", frame: 4 }],
        frameRate: 1,
        repeat: -1,
      });

      // 敵アニメーション
      if (this.textures.exists("enemy-sprite")) {
        this.anims.create({
          key: "enemy-idle",
          frames: [{ key: "enemy-sprite", frame: 0 }],
          frameRate: 1,
          repeat: -1,
        });
        this.anims.create({
          key: "enemy-punch",
          frames: [{ key: "enemy-sprite", frame: 1 }],
          frameRate: 1,
          repeat: 0,
        });
        this.anims.create({
          key: "enemy-kick",
          frames: [{ key: "enemy-sprite", frame: 2 }],
          frameRate: 1,
          repeat: 0,
        });
      }

      this.scene.start("BattleScene");
    }
  };
}
