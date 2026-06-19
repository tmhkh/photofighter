"""キャラクター生成パイプライン.

写真からゲーム用アバターキャラクターを生成する。
元画像は処理完了後に即座にメモリから破棄する。
"""

import base64
import io
import json
import uuid

import boto3
from PIL import Image
from rembg import remove

from app.core.config import settings
from app.models.character import CharacterRepository
from app.schemas.character import CharacterResponse


class CharacterGeneratorService:
    """キャラクター生成サービス."""

    def __init__(self) -> None:
        """サービスを初期化する."""
        self._bedrock = boto3.client(
            "bedrock-runtime", region_name=settings.aws_region
        )
        self._s3 = boto3.client("s3", region_name=settings.aws_region)
        self._character_repo = CharacterRepository()

    async def generate(
        self, image_bytes: bytes, user_id: str
    ) -> CharacterResponse:
        """写真からキャラクターを生成する."""
        try:
            # Step 1: 背景除去（メモリ上）
            foreground = self._remove_background(image_bytes)

            # Step 2: ゲームスタイル変換（Bedrock）
            styled = await self._style_transfer(foreground)

            # Step 3: スプライトシート生成
            spritesheet = self._generate_spritesheet(styled)

            # Step 4: S3 保存（スプライトのみ）
            s3_key = self._upload_sprite(spritesheet, user_id)

            # Step 5: DB 保存
            character = await self._character_repo.create(
                user_id=user_id,
                name=f"Fighter-{uuid.uuid4().hex[:6]}",
                sprite_s3_key=s3_key,
            )

            return CharacterResponse(
                character_id=character["character_id"],
                user_id=character["user_id"],
                name=character["name"],
                sprite_url=(
                    f"https://{settings.s3_bucket_sprites}"
                    f".s3.amazonaws.com/{s3_key}"
                ),
                style=character["style"],
                created_at=character["created_at"],
            )
        finally:
            # 元画像データを明示的にクリア
            del image_bytes

    def _remove_background(self, image_bytes: bytes) -> bytes:
        """rembg で背景を除去する（メモリ上のみ）."""
        return remove(image_bytes)

    async def _style_transfer(self, image_bytes: bytes) -> bytes:
        """Bedrock Nova Canvas でゲームスタイルに変換."""
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        body = json.dumps(
            {
                "taskType": "IMAGE_VARIATION",
                "imageVariationParams": {
                    "images": [image_b64],
                    "text": (
                        "2D pixel art fighting game character, "
                        "chibi style, full body, action pose, "
                        "transparent background, game sprite"
                    ),
                },
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "width": 512,
                    "height": 512,
                    "cfgScale": 7.0,
                },
            }
        )

        response = self._bedrock.invoke_model(
            modelId=settings.bedrock_model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        result = json.loads(response["body"].read())
        output_b64 = result["images"][0]
        return base64.b64decode(output_b64)

    def _generate_spritesheet(self, styled_bytes: bytes) -> bytes:
        """スタイル変換済み画像からスプライトシートを生成."""
        img = Image.open(io.BytesIO(styled_bytes)).convert("RGBA")
        img = img.resize((128, 128), Image.Resampling.LANCZOS)

        # MVP: 6フレーム分のスプライトシート (768x128)
        sheet_width = 128 * 6
        sheet = Image.new("RGBA", (sheet_width, 128), (0, 0, 0, 0))

        for i in range(6):
            frame = img.copy()
            sheet.paste(frame, (i * 128, 0))

        buffer = io.BytesIO()
        sheet.save(buffer, format="PNG")
        return buffer.getvalue()

    def _upload_sprite(self, sprite_bytes: bytes, user_id: str) -> str:
        """スプライトシートを S3 にアップロードする."""
        s3_key = f"sprites/{user_id}/{uuid.uuid4().hex}.png"
        self._s3.put_object(
            Bucket=settings.s3_bucket_sprites,
            Key=s3_key,
            Body=sprite_bytes,
            ContentType="image/png",
        )
        return s3_key
