"""PhotoFighter FastAPI アプリケーションエントリポイント."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import characters, game
from app.core.config import settings
from app.core.origin_verify import OriginVerifyMiddleware

app = FastAPI(
    title="PhotoFighter API",
    description="写真からキャラクターを生成して戦う格闘ゲームのAPI",
    version="0.2.0",
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CloudFront オリジン検証（CORS の後に追加 = リクエスト処理時に先に実行される）
app.add_middleware(OriginVerifyMiddleware)

# ルーター登録 (認証は共通認証基盤に委任)
app.include_router(characters.router, prefix="/api/characters", tags=["キャラクター"])
app.include_router(game.router, prefix="/api/game", tags=["ゲーム"])


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント."""
    return {"status": "healthy", "service": "photofighter"}
