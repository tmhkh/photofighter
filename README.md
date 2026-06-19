# PhotoFighter

写真からキャラクターを生成して戦う1対1格闘ゲーム。

## 概要

ユーザーが自分の写真をアップロードすると、Amazon Bedrock（Nova Canvas）を使ってゲーム用アバターキャラクターを自動生成。そのキャラクターを操作して、可愛い敵キャラ（オニ・ゴブリン・龍）と格闘バトルを楽しめるWebブラウザゲームです。

## 特徴

- **写真からキャラ生成**: 顔写真をアップロードするだけで格闘ゲーム風キャラクターを自動生成
- **プライバシー重視**: 写真データはメモリ上で処理し、永続保存しない。外部サービスへの送信なし
- **ブラウザで遊べる**: PC・スマホ Chrome 対応
- **1対1格闘バトル**: 可愛い敵キャラと本格的な格闘アクション

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | Python 3.12 / FastAPI |
| フロントエンド | React / Vite / TypeScript |
| ゲームエンジン | Phaser 3 |
| 画像処理 | rembg / Pillow |
| AI生成 | Amazon Bedrock (Nova Canvas) |
| DB | DynamoDB |
| インフラ | AWS App Runner / CloudFront / S3 |
| IaC | AWS CDK (TypeScript) |

## プロジェクト構成

```
photofighter/
├── backend/          # FastAPI バックエンド
│   ├── app/
│   │   ├── api/      # エンドポイント
│   │   ├── core/     # 設定・認証
│   │   ├── models/   # DynamoDB リポジトリ
│   │   ├── schemas/  # Pydantic スキーマ
│   │   └── services/ # ビジネスロジック
│   └── tests/        # pytest テスト
├── frontend/         # React + Phaser フロントエンド
│   └── src/
│       ├── pages/    # ページコンポーネント
│       ├── game/     # Phaser ゲームシーン
│       ├── services/ # API クライアント
│       └── components/
├── infra/            # AWS CDK インフラ定義
│   ├── bin/
│   └── lib/
└── specs/            # 仕様書
```

## セットアップ

### 前提条件

- Python 3.12+
- Node.js 20+
- AWS CLI (設定済み)
- AWS CDK CLI

### バックエンド

```bash
cd backend
cp .env.example .env
# .env の JWT_SECRET_KEY を安全なランダム値に変更

pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

### インフラデプロイ

```bash
cd infra
npm install
npx cdk deploy --require-approval never
```

## プライバシーとセキュリティ

- アップロード写真はサーバーメモリ上でのみ処理され、ディスクやS3に保存されません
- Amazon Bedrock はAWS内サービスであり、入力データがモデル学習に利用されることはありません
- パスワードは bcrypt でハッシュ化
- AWS WAF による OWASP Top 10 対策
- 機密情報は環境変数または Secrets Manager で管理

## ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照
