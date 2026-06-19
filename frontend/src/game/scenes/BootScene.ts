import Phaser from "phaser";

/**
 * ブートシーン: アセット読み込み
 */
export class BootScene extends Phaser.Scene {
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

    // TODO: 実際のスプライトシートを読み込む
    // this.load.spritesheet("player", "/sprites/player.png", { ... });
    // this.load.spritesheet("oni", "/sprites/oni.png", { ... });
  }

  create(): void {
    this.scene.start("BattleScene");
  }
}
