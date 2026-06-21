# PhotoFighter AWS 構成図

```mermaid
graph TB
    subgraph Users["ユーザー"]
        Browser["ブラウザ"]
    end

    subgraph CloudFront["Amazon CloudFront"]
        CF["CloudFront Distribution<br/>REDACTED_CLOUDFRONT_DOMAIN"]
    end

    subgraph S3["Amazon S3"]
        FrontendBucket["Frontend Bucket<br/>photofighter-frontend-*<br/>(React SPA)"]
        SpritesBucket["Sprites Bucket<br/>photofighter-sprites-*<br/>(スプライトシート保存)"]
    end

    subgraph Compute["AWS Lambda"]
        LambdaFn["photofighter-api<br/>Docker Image (ARM64)<br/>Python 3.12 / FastAPI<br/>Memory: 1536MB"]
    end

    subgraph Auth["Amazon Cognito"]
        UserPool["User Pool<br/>REDACTED_USER_POOL_ID<br/>(hanashite-tsukurun と共有)"]
        AppClient["App Client<br/>photofighter"]
    end

    subgraph Database["Amazon DynamoDB"]
        UsersTable["photofighter-users<br/>PK: user_id"]
        CharactersTable["photofighter-characters<br/>PK: character_id<br/>GSI: user-id-index"]
    end

    subgraph AI["Amazon Bedrock"]
        Bedrock["Bedrock<br/>InvokeModel"]
    end

    %% ユーザーアクセス
    Browser -->|HTTPS| CF

    %% CloudFront ルーティング
    CF -->|"/ (静的ファイル)"| FrontendBucket
    CF -->|"/api/* (API リクエスト)"| LambdaFn

    %% Lambda -> 各サービス
    LambdaFn -->|認証トークン検証| UserPool
    LambdaFn -->|Read/Write| UsersTable
    LambdaFn -->|Read/Write| CharactersTable
    LambdaFn -->|Read/Write| SpritesBucket
    LambdaFn -->|画像生成| Bedrock

    %% 認証フロー
    Browser -->|サインイン/サインアップ| AppClient
    AppClient -.->|belongs to| UserPool

    %% スタイル
    classDef aws fill:#FF9900,stroke:#232F3E,color:#232F3E
    classDef storage fill:#3F8624,stroke:#232F3E,color:#fff
    classDef compute fill:#D86613,stroke:#232F3E,color:#fff
    classDef database fill:#3B48CC,stroke:#232F3E,color:#fff
    classDef network fill:#8C4FFF,stroke:#232F3E,color:#fff
    classDef ai fill:#01A88D,stroke:#232F3E,color:#fff

    class CF network
    class FrontendBucket,SpritesBucket storage
    class LambdaFn compute
    class UserPool,AppClient aws
    class UsersTable,CharactersTable database
    class Bedrock ai
```

## リソース一覧

| サービス | リソース名 | 用途 |
|---------|-----------|------|
| CloudFront | FrontendDistribution | SPA 配信 + API リバースプロキシ |
| S3 | photofighter-frontend-* | フロントエンド静的ファイルホスティング |
| S3 | photofighter-sprites-* | キャラクタースプライトシート保存 (90日で自動削除) |
| Lambda | photofighter-api | FastAPI バックエンド (Docker, ARM64, 1536MB) |
| DynamoDB | photofighter-users | ユーザー情報テーブル |
| DynamoDB | photofighter-characters | キャラクター情報テーブル (GSI: user-id-index) |
| Cognito | REDACTED_USER_POOL_ID | ユーザー認証 (hanashite-tsukurun と共有) |
| Bedrock | InvokeModel | AI による画像生成 |

## アクセスパターン

1. **静的コンテンツ配信**: Browser → CloudFront → S3 (OAC 経由)
2. **API リクエスト**: Browser → CloudFront (`/api/*`) → Lambda Function URL
3. **認証**: Browser → Cognito App Client → User Pool (SRP / パスワード認証)
4. **背景除去**: Lambda → rembg (onnxruntime, ローカル処理)
5. **キャラクター生成**: Lambda → Bedrock (InvokeModel)
