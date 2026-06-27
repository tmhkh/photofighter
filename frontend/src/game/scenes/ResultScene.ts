import Phaser from "phaser";

/**
 * リザルトシーン: 勝敗結果表示
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: "ResultScene" });
  }

  create(data: { result: "win" | "lose" }): void {
    const { width, height } = this.cameras.main;

    const isWin = data.result === "win";
    // 背景色はバトル画面と同じ落ち着いた色を維持
    this.cameras.main.setBackgroundColor("#2d1b4e");

    this.add
      .text(width / 2, height / 3, isWin ? "YOU WIN!" : "YOU LOSE...", {
        fontSize: "56px",
        color: isWin ? "#66bb6a" : "#ef5350",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const retryBtn = this.add
      .text(width / 2, height / 2 + 40, "RETRY", {
        fontSize: "24px",
        color: "#000",
        backgroundColor: "#ffab40",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerdown", () => {
      this.scene.start("BattleScene");
    });

    const homeBtn = this.add
      .text(width / 2, height / 2 + 100, "HOME", {
        fontSize: "18px",
        color: "#4fc3f7",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    homeBtn.on("pointerdown", () => {
      window.location.href = "/characters";
    });
  }
}
