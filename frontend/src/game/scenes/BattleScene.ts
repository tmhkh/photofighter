import Phaser from "phaser";

/**
 * BattleScene ファクトリ: 1対1格闘ゲームのメインシーン
 * キャラクターはスプライトシートアニメーションで表示。
 * フレーム: [0]idle [1]punch [2]kick [3]jump [4]guard
 */
export function createBattleScene() {
  return class BattleScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
    private enemy!: Phaser.GameObjects.Sprite;
    private playerHp = 100;
    private enemyHp = 100;
    private playerHpBar!: Phaser.GameObjects.Graphics;
    private enemyHpBar!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keys!: Record<string, Phaser.Input.Keyboard.Key>;
    private ground!: Phaser.GameObjects.Rectangle;
    private isPlayerAttacking = false;
    private isGuarding = false;
    private virtualPad = { left: false, right: false, jump: false };

    // キャラクター表示サイズ
    private readonly PLAYER_W = 256;
    private readonly PLAYER_H = 384;

    constructor() {
      super({ key: "BattleScene" });
    }

    create(): void {
      const { width, height } = this.cameras.main;
      this.playerHp = 100;
      this.enemyHp = 100;
      this.isPlayerAttacking = false;
      this.isGuarding = false;

      this.cameras.main.setBackgroundColor("#2d1b4e");

      // 地面
      this.ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x4a3728);
      this.physics.add.existing(this.ground, true);

      // プレイヤー（スプライトシート）
      // 地面の上面 = height - 40、キャラ高さの半分を引いた位置に配置
      const groundTop = height - 40;
      this.player = this.add.sprite(180, groundTop - this.PLAYER_H / 2, "player-sprite");
      this.player.setDisplaySize(this.PLAYER_W, this.PLAYER_H);
      this.physics.add.existing(this.player);
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setCollideWorldBounds(true);
      playerBody.setBounce(0);
      this.player.play("player-idle");

      // 敵（鬼スプライト or フォールバック四角形）
      const enemyY = groundTop - this.PLAYER_H / 2;
      if (this.textures.exists("enemy-sprite")) {
        this.enemy = this.add.sprite(620, enemyY, "enemy-sprite");
        this.enemy.setDisplaySize(this.PLAYER_W, this.PLAYER_H);
        this.enemy.setFlipX(false); // 元画像が左向きのためそのままでプレイヤー方向
        (this.enemy as Phaser.GameObjects.Sprite).play("enemy-idle");
      } else {
        // フォールバック: 赤い四角形
        const rect = this.add.rectangle(620, enemyY, 140, 300, 0xef5350);
        this.enemy = rect as unknown as Phaser.GameObjects.Sprite;
      }
      this.physics.add.existing(this.enemy);
      const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
      enemyBody.setCollideWorldBounds(true);
      enemyBody.setBounce(0);

      this.physics.add.collider(this.player, this.ground);
      this.physics.add.collider(this.enemy, this.ground);

      // HPバー
      this.playerHpBar = this.add.graphics();
      this.enemyHpBar = this.add.graphics();
      this.drawHpBars();

      // キーボード入力
      this.cursors = this.input.keyboard!.createCursorKeys();
      this.keys = {
        punch: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        kick: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        guard: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      };

      // 仮想パッド（スマホ用）
      this.createVirtualPad();

      // ラベル
      this.add.text(20, 10, "PLAYER", { fontSize: "14px", color: "#4fc3f7" });
      this.add.text(width - 80, 10, "ONI", { fontSize: "14px", color: "#ef5350" });

      // 操作説明
      if (this.sys.game.device.os.desktop) {
        this.add.text(width / 2, height - 8, "← → 移動 | ↑ ジャンプ | Z パンチ | X キック | C ガード", {
          fontSize: "11px",
          color: "#888",
        }).setOrigin(0.5, 1);
      }
    }

    update(): void {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

      const leftDown = this.cursors.left.isDown || this.virtualPad.left;
      const rightDown = this.cursors.right.isDown || this.virtualPad.right;
      const jumpDown = this.cursors.up.isDown || this.virtualPad.jump;

      // ガード
      this.isGuarding = this.keys.guard.isDown;

      if (leftDown) {
        playerBody.setVelocityX(-220);
        this.player.setFlipX(true);
      } else if (rightDown) {
        playerBody.setVelocityX(220);
        this.player.setFlipX(false);
      } else {
        playerBody.setVelocityX(0);
      }

      if (jumpDown && playerBody.blocked.down) {
        playerBody.setVelocityY(-380);
      }

      // パンチ
      if (Phaser.Input.Keyboard.JustDown(this.keys.punch) && !this.isPlayerAttacking) {
        this.playerAttack("punch", 10);
      }
      // キック
      if (Phaser.Input.Keyboard.JustDown(this.keys.kick) && !this.isPlayerAttacking) {
        this.playerAttack("kick", 15);
      }

      // アニメーション更新
      this.updatePlayerAnimation(playerBody);

      this.updateEnemyAI();
      this.drawHpBars();

      if (this.enemyHp <= 0) {
        this.scene.start("ResultScene", { result: "win" });
      }
      if (this.playerHp <= 0) {
        this.scene.start("ResultScene", { result: "lose" });
      }
    }

    private updatePlayerAnimation(body: Phaser.Physics.Arcade.Body): void {
      if (this.isPlayerAttacking) return; // 攻撃中は切り替えない

      if (!body.blocked.down) {
        this.player.play("player-jump", true);
      } else if (this.isGuarding) {
        this.player.play("player-guard", true);
      } else {
        this.player.play("player-idle", true);
      }
    }

    private playerAttack(type: "punch" | "kick", damage: number): void {
      this.isPlayerAttacking = true;
      this.player.play(`player-${type}`, true);

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.enemy.x, this.enemy.y
      );
      if (dist < 220) {
        this.enemyHp = Math.max(0, this.enemyHp - damage);
        this.flashObject(this.enemy);
      }

      this.time.delayedCall(350, () => {
        this.isPlayerAttacking = false;
      });
    }

    private updateEnemyAI(): void {
      const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
      const dist = this.player.x - this.enemy.x;

      if (Math.abs(dist) > 200) {
        enemyBody.setVelocityX(dist > 0 ? 130 : -130);
        // 移動方向に向く
        if (this.enemy.setFlipX) {
          this.enemy.setFlipX(dist < 0);
        }
        if (this.anims && this.enemy.play) {
          this.enemy.play("enemy-idle", true);
        }
      } else {
        enemyBody.setVelocityX(0);
        if (Math.random() < 0.02) {
          const damage = this.isGuarding ? 3 : 12;
          this.playerHp = Math.max(0, this.playerHp - damage);
          this.flashObject(this.player);
          // 敵攻撃アニメーション
          if (this.enemy.play && this.anims.exists("enemy-punch")) {
            this.enemy.play("enemy-punch", true);
            this.time.delayedCall(400, () => {
              if (this.enemy.play && this.anims.exists("enemy-idle")) {
                this.enemy.play("enemy-idle", true);
              }
            });
          }
        }
      }
    }

    private flashObject(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): void {
      this.tweens.add({
        targets: obj,
        alpha: 0.3,
        duration: 80,
        yoyo: true,
        repeat: 2,
      });
    }

    private drawHpBars(): void {
      const { width } = this.cameras.main;
      this.playerHpBar.clear();
      this.playerHpBar.fillStyle(0x333333);
      this.playerHpBar.fillRect(20, 30, 200, 16);
      this.playerHpBar.fillStyle(0x66bb6a);
      this.playerHpBar.fillRect(20, 30, 200 * (this.playerHp / 100), 16);

      this.enemyHpBar.clear();
      this.enemyHpBar.fillStyle(0x333333);
      this.enemyHpBar.fillRect(width - 220, 30, 200, 16);
      this.enemyHpBar.fillStyle(0xef5350);
      this.enemyHpBar.fillRect(width - 220, 30, 200 * (this.enemyHp / 100), 16);
    }

    private createVirtualPad(): void {
      if (!this.sys.game.device.os.desktop) {
        const { width, height } = this.cameras.main;
        const btnStyle = { fontSize: "20px", backgroundColor: "#333a", padding: { x: 14, y: 10 } };

        const leftBtn = this.add.text(20, height - 70, "◀", btnStyle).setInteractive();
        const rightBtn = this.add.text(80, height - 70, "▶", btnStyle).setInteractive();
        const jumpBtn = this.add.text(width - 240, height - 70, "⬆", btnStyle).setInteractive();
        const punchBtn = this.add.text(width - 170, height - 70, "P", btnStyle).setInteractive();
        const kickBtn = this.add.text(width - 110, height - 70, "K", btnStyle).setInteractive();
        const guardBtn = this.add.text(width - 50, height - 70, "G", btnStyle).setInteractive();

        leftBtn.on("pointerdown", () => (this.virtualPad.left = true));
        leftBtn.on("pointerup", () => (this.virtualPad.left = false));
        leftBtn.on("pointerout", () => (this.virtualPad.left = false));
        rightBtn.on("pointerdown", () => (this.virtualPad.right = true));
        rightBtn.on("pointerup", () => (this.virtualPad.right = false));
        rightBtn.on("pointerout", () => (this.virtualPad.right = false));
        jumpBtn.on("pointerdown", () => (this.virtualPad.jump = true));
        jumpBtn.on("pointerup", () => (this.virtualPad.jump = false));
        jumpBtn.on("pointerout", () => (this.virtualPad.jump = false));
        punchBtn.on("pointerdown", () => this.playerAttack("punch", 10));
        kickBtn.on("pointerdown", () => this.playerAttack("kick", 15));
        guardBtn.on("pointerdown", () => (this.isGuarding = true));
        guardBtn.on("pointerup", () => (this.isGuarding = false));
        guardBtn.on("pointerout", () => (this.isGuarding = false));
      }
    }
  };
}
