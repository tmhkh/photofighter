# PhotoFighter MVP 設計書

## システムアーキテクチャ

```
クライアント (React + Phaser 3)
  → CloudFront + S3 (静的配信)
  → FastAPI (App Runner)
    → DynamoDB (ユーザー/キャラクターデータ)
    → S3 (生成済みスプライトのみ)
    → Bedrock Nova Canvas (画像スタイル変換)
    → rembg (背景除去、ローカル実行)
```

## キャラクター生成パイプライン

1. 写真アップロード → メモリ上で受け取り
2. rembg で背景除去（ローカル処理）
3. Bedrock Nova Canvas でゲームスタイル変換
4. Pillow でスプライトシート生成
5. S3 保存（スプライトのみ）
6. 元画像はメモリから即時破棄

## データベース設計

- users テーブル: user_id(PK), email, password_hash, created_at
- characters テーブル: character_id(PK), user_id(GSI), name, sprite_s3_key, created_at

## API設計

- POST /api/auth/register - ユーザー登録
- POST /api/auth/login - ログイン
- POST /api/characters/generate - キャラクター生成
- GET /api/characters - キャラクター一覧
- DELETE /api/characters/{id} - キャラクター削除
- GET /api/game/stages - ステージ一覧
- POST /api/game/results - バトル結果記録

## セキュリティ

- パスワード: bcrypt (cost factor 12)
- JWT: HS256, 有効期限1時間
- 写真データ: メモリ上のみ、外部送信なし
- WAF: OWASP Top 10 マネージドルール
