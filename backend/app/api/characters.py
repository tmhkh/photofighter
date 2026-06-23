"""キャラクター生成エンドポイント."""

import json
import uuid

import boto3
from botocore.config import Config as BotoConfig
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import get_current_user_id
from app.models.character import CharacterRepository
from app.schemas.character import CharacterResponse
from app.services.character_generator import CharacterGeneratorService

router = APIRouter()
character_repo = CharacterRepository()
generator_service = CharacterGeneratorService()
_lambda_client = boto3.client("lambda", region_name=settings.aws_region)
_s3_client = boto3.client(
    "s3",
    region_name=settings.aws_region,
    config=BotoConfig(signature_version="s3v4"),
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
PRESIGNED_URL_EXPIRY = 900  # 15分


def _to_response(item: dict) -> CharacterResponse:
    """DynamoDB アイテムから CharacterResponse を構築する."""
    sprite_key = item.get("sprite_s3_key", "")
    sprite_url = ""
    if sprite_key:
        sprite_url = _s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.s3_bucket_sprites,
                "Key": sprite_key,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
    return CharacterResponse(
        character_id=item["character_id"],
        user_id=item["user_id"],
        name=item["name"],
        sprite_url=sprite_url,
        style=item.get("style", "fighter"),
        status=item.get("status", "completed"),
        error_message=item.get("error_message", ""),
        created_at=item["created_at"],
    )


@router.post(
    "/generate",
    response_model=CharacterResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_character(
    photo: UploadFile,
    user_id: str = Depends(get_current_user_id),
) -> CharacterResponse:
    """写真からキャラクター生成を開始する（非同期）.

    元画像を S3 に一時保存し、processing 状態のレコードを作成して
    Worker Lambda を非同期実行する。クライアントは status をポーリングする。
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

    ext = "png" if photo.content_type == "image/png" else "jpg"

    try:
        # 元画像を S3 に一時保存
        upload_key = generator_service.upload_original(image_bytes, user_id, ext)
    finally:
        del image_bytes

    # processing 状態でレコード作成
    character = await character_repo.create(
        user_id=user_id,
        name=f"Fighter-{uuid.uuid4().hex[:6]}",
    )

    # Worker Lambda を非同期 invoke
    _lambda_client.invoke(
        FunctionName=settings.worker_function_name,
        InvocationType="Event",
        Payload=json.dumps(
            {
                "character_id": character["character_id"],
                "user_id": user_id,
                "upload_key": upload_key,
            },
        ).encode("utf-8"),
    )

    return _to_response(character)


@router.get("", response_model=list[CharacterResponse])
async def list_characters(
    user_id: str = Depends(get_current_user_id),
) -> list[CharacterResponse]:
    """自分のキャラクター一覧を取得する."""
    characters = await character_repo.list_by_user(user_id)
    return [_to_response(c) for c in characters]


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
) -> CharacterResponse:
    """キャラクター詳細を取得する（生成状況の確認に使用）."""
    character = await character_repo.get(character_id)
    if not character or character["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="キャラクターが見つかりません",
        )
    return _to_response(character)


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


@router.get("/{character_id}/image")
async def get_character_image(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """キャラクター画像を S3 からプロキシ配信する.

    CORS 問題を回避するため、CloudFront/API 経由で画像を返す。
    """
    from fastapi.responses import Response

    character = await character_repo.get(character_id)
    if not character or character["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="キャラクターが見つかりません",
        )

    sprite_key = character.get("sprite_s3_key", "")
    if not sprite_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="画像がまだ生成されていません",
        )

    obj = _s3_client.get_object(
        Bucket=settings.s3_bucket_sprites,
        Key=sprite_key,
    )
    image_bytes = obj["Body"].read()
    content_type = obj.get("ContentType", "image/png")

    return Response(
        content=image_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=3600",
        },
    )


@router.get("/enemy/{enemy_type}/spritesheet")
async def get_enemy_spritesheet(
    enemy_type: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """敵キャラのスプライトシートを返す（アセットから生成）."""
    import io
    import pathlib

    from fastapi.responses import Response
    from PIL import Image

    # アセットディレクトリ
    assets_base = pathlib.Path(__file__).resolve().parent.parent / "assets" / enemy_type
    if not assets_base.exists():
        assets_base = pathlib.Path(f"/var/task/assets/{enemy_type}")
    if not assets_base.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"敵タイプ '{enemy_type}' が見つかりません",
        )

    # 5フレームスプライトシート生成
    frame_w, frame_h = 128, 192
    actions = ["idle", "punch", "kick", "jump", "guard"]
    action_file_map = {
        "idle": "body_idle.png",
        "punch": "body_punch.png",
        "kick": "body_kick.png",
        "jump": "body_jump.png",
        "guard": "body_guard.png",
    }

    sheet = Image.new("RGBA", (frame_w * len(actions), frame_h), (0, 0, 0, 0))
    for i, action in enumerate(actions):
        filename = action_file_map[action]
        asset_path = assets_base / filename
        if asset_path.exists():
            frame = Image.open(asset_path).convert("RGBA")
        else:
            frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
        sheet.paste(frame, (i * frame_w, 0))

    buffer = io.BytesIO()
    sheet.save(buffer, format="PNG")

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
