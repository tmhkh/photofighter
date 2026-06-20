"""認証エンドポイント.

ユーザー登録・ログインは Cognito（フロントエンド側）で行う。
バックエンドはトークン検証のみ担当する。
"""

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id

router = APIRouter()


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    """現在のユーザー情報を返す（トークン検証確認用）."""
    return {"user_id": user_id}
