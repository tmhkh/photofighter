"""アプリケーション設定."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定.

    環境変数から読み込む。.env ファイルもサポート。
    """

    # アプリケーション
    app_name: str = "PhotoFighter"
    debug: bool = False

    # Cognito 認証
    cognito_user_pool_id: str = "ap-northeast-1_VNCSv95Dm"
    cognito_client_id: str = ""

    # AWS
    aws_region: str = "ap-northeast-1"
    dynamodb_table_users: str = "photofighter-users"
    dynamodb_table_characters: str = "photofighter-characters"
    s3_bucket_sprites: str = "photofighter-sprites"

    # 非同期 Worker Lambda
    worker_function_name: str = "photofighter-worker"

    # キャラクター生成制限
    monthly_generation_limit: int = 5

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173"]

    # CloudFront オリジン検証
    origin_verify_header: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
