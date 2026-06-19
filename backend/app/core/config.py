"""アプリケーション設定."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定.

    環境変数から読み込む。.env ファイルもサポート。
    """

    # アプリケーション
    app_name: str = "PhotoFighter"
    debug: bool = False

    # 認証
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # AWS
    aws_region: str = "ap-northeast-1"
    dynamodb_table_users: str = "photofighter-users"
    dynamodb_table_characters: str = "photofighter-characters"
    s3_bucket_sprites: str = "photofighter-sprites"

    # Bedrock
    bedrock_model_id: str = "amazon.nova-canvas-v1:0"

    # キャラクター生成制限
    monthly_generation_limit: int = 5

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
