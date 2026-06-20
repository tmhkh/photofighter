"""認証レスポンススキーマ.

ユーザー登録・ログインは Cognito が処理するため、
バックエンドではトークン検証結果のレスポンスのみ定義する。
"""

from pydantic import BaseModel


class UserInfo(BaseModel):
    """現在のユーザー情報."""

    user_id: str
