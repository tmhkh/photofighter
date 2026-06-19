"""PhotoFighter FastAPI アプリケーションエントリポイント."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, characters, game
from app.core.config import settings

app = FastAPI(
    title="PhotoFighter API",
    description="写真からキャラクターを生成して戦う格闘ゲームのAPI",
    version="0.1.0",
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(auth.router, prefix="/api/auth", tags=["認証"])
app.include_router(characters.router, prefix="/api/characters", tags=["キャラクター"])
app.include_router(game.router, prefix="/api/game", tags=["ゲーム"])


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント."""
    return {"status": "healthy", "service": "photofighter"}
