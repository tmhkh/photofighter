"""認証リクエスト・レスポンススキーマ."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """ユーザー登録リクエスト."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="パスワード（8文字以上）")


class LoginRequest(BaseModel):
    """ログインリクエスト."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """トークンレスポンス."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
