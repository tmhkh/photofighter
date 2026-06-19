"""認証エンドポイント."""

from fastapi import APIRouter, HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter()
user_repo = UserRepository()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> TokenResponse:
    """ユーザー登録."""
    existing = await user_repo.get_by_email(request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="このメールアドレスは既に登録されています",
        )

    password_hash = hash_password(request.password)
    user = await user_repo.create(email=request.email, password_hash=password_hash)

    access_token = create_access_token(user["user_id"])
    refresh_token = create_refresh_token(user["user_id"])

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """ログイン."""
    user = await user_repo.get_by_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )

    access_token = create_access_token(user["user_id"])
    refresh_token = create_refresh_token(user["user_id"])

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str) -> TokenResponse:
    """トークンリフレッシュ."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なリフレッシュトークンです",
        )

    user_id = payload["sub"]
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )
