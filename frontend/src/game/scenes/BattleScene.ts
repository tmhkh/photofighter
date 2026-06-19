import Phaser from "phaser";

/**
 * バトルシーン: 1対1格闘ゲームのメインシーン
 */
export class BattleScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private enemy!: Phaser.GameObjects.Rectangle;
  private playerHp = 100;
  private enemyHp = 100;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private ground!: Phaser.GameObjects.Rectangle;
  private isPlayerAttacking = false;
  private virtualPad = { left: false, right: false, jump: false };

  constructor() {
    super({ key: "BattleScene" });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.playerHp = 100;
    this.enemyHp = 100;

    this.cameras.main.setBackgroundColor("#2d1b4e");

    // 地面
    this.ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x4a3728);
    this.physics.add.existing(this.ground, true);

    // プレイヤー（仮RECT）
    this.player = this.add.rectangle(200, height - 100, 64, 96, 0x4fc3f7);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);
    playerBody.setBounce(0.1);

    // 敵（オニ）
    this.enemy = this.add.rectangle(600, height - 100, 72, 96, 0xef5350);
    this.physics.add.existing(this.enemy);
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    enemyBody.setCollideWorldBounds(true);
    enemyBody.setBounce(0.1);

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
  }

  update(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    const leftDown = this.cursors.left.isDown || this.virtualPad.left;
    const rightDown = this.cursors.right.isDown || this.virtualPad.right;
    const jumpDown = this.cursors.up.isDown || this.virtualPad.jump;

    if (leftDown) {
      playerBody.setVelocityX(-200);
    } else if (rightDown) {
      playerBody.setVelocityX(200);
    } else {
      playerBody.setVelocityX(0);
    }

    if (jumpDown && playerBody.blocked.down) {
      playerBody.setVelocityY(-400);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.punch) && !this.isPlayerAttacking) {
      this.playerAttack(10);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.kick) && !this.isPlayerAttacking) {
      this.playerAttack(15);
    }

    this.updateEnemyAI();
    this.drawHpBars();

    if (this.enemyHp <= 0) {
      this.scene.start("ResultScene", { result: "win" });
    }
    if (this.playerHp <= 0) {
      this.scene.start("ResultScene", { result: "lose" });
    }
  }

  private playerAttack(damage: number): void {
    this.isPlayerAttacking = true;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.enemy.x, this.enemy.y
    );
    if (dist < 120) {
      this.enemyHp = Math.max(0, this.enemyHp - damage);
      this.flashObject(this.enemy);
    }
    this.time.delayedCall(300, () => {
      this.isPlayerAttacking = false;
    });
  }

  private updateEnemyAI(): void {
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    const dist = this.player.x - this.enemy.x;

    if (Math.abs(dist) > 100) {
      enemyBody.setVelocityX(dist > 0 ? 120 : -120);
    } else {
      enemyBody.setVelocityX(0);
      if (Math.random() < 0.02) {
        this.playerHp = Math.max(0, this.playerHp - 12);
        this.flashObject(this.player);
      }
    }
  }

  private flashObject(obj: Phaser.GameObjects.Rectangle): void {
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
      const btnStyle = { fontSize: "24px", backgroundColor: "#333", padding: { x: 16, y: 12 } };

      const leftBtn = this.add.text(40, height - 80, "<", btnStyle).setInteractive();
      const rightBtn = this.add.text(120, height - 80, ">", btnStyle).setInteractive();
      const jumpBtn = this.add.text(width - 200, height - 80, "JUMP", btnStyle).setInteractive();
      const punchBtn = this.add.text(width - 80, height - 80, "P", btnStyle).setInteractive();

      leftBtn.on("pointerdown", () => (this.virtualPad.left = true));
      leftBtn.on("pointerup", () => (this.virtualPad.left = false));
      leftBtn.on("pointerout", () => (this.virtualPad.left = false));
      rightBtn.on("pointerdown", () => (this.virtualPad.right = true));
      rightBtn.on("pointerup", () => (this.virtualPad.right = false));
      rightBtn.on("pointerout", () => (this.virtualPad.right = false));
      jumpBtn.on("pointerdown", () => (this.virtualPad.jump = true));
      jumpBtn.on("pointerup", () => (this.virtualPad.jump = false));
      jumpBtn.on("pointerout", () => (this.virtualPad.jump = false));
      punchBtn.on("pointerdown", () => this.playerAttack(10));
    }
  }
}
