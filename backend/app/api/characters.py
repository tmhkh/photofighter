"""キャラクター生成エンドポイント."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import get_current_user_id
from app.models.character import CharacterRepository
from app.schemas.character import CharacterResponse
from app.services.character_generator import CharacterGeneratorService

router = APIRouter()
character_repo = CharacterRepository()
generator_service = CharacterGeneratorService()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/generate", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def generate_character(
    photo: UploadFile,
    user_id: str = Depends(get_current_user_id),
) -> CharacterResponse:
    """写真からキャラクターを生成する.

    写真はメモリ上で処理し、S3やディスクに永続保存しない。
    """
    if photo.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JPEG または PNG 画像のみ対応しています",
        )

    count = await character_repo.get_monthly_generation_count(user_id)
    if count >= settings.monthly_generation_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"月間生成上限（{settings.monthly_generation_limit}回）に達しています",
        )

    image_bytes = await photo.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ファイルサイズは5MB以下にしてください",
        )

    try:
        character = await generator_service.generate(
            image_bytes=image_bytes,
            user_id=user_id,
        )
        return character
    finally:
        del image_bytes


@router.get("", response_model=list[CharacterResponse])
async def list_characters(
    user_id: str = Depends(get_current_user_id),
) -> list[CharacterResponse]:
    """自分のキャラクター一覧を取得する."""
    characters = await character_repo.list_by_user(user_id)
    return characters


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
) -> CharacterResponse:
    """キャラクター詳細を取得する."""
    character = await character_repo.get(character_id)
    if not character or character["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="キャラクターが見つかりません",
        )
    return character


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """キャラクターを削除する."""
    character = await character_repo.get(character_id)
    if not character or character["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="キャラクターが見つかりません",
        )
    await character_repo.delete(character_id)
