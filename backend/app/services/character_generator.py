"""キャラクター生成パイプライン.

写真からゲーム用アバターキャラクターを生成する。

非同期構成:
- API Lambda: 元画像を S3 の uploads/ に一時保存し、processing レコードを作成
- Worker Lambda: uploads/ から元画像を取得して生成処理を行い、完了後に元画像を削除
"""

import io
import uuid

import boto3
from PIL import Image

from app.core.config import settings
from app.models.character import CharacterRepository


class CharacterGeneratorService:
    """キャラクター生成サービス."""

    def __init__(self) -> None:
        """サービスを初期化する."""
        self._s3 = boto3.client("s3", region_name=settings.aws_region)
        self._character_repo = CharacterRepository()

    def upload_original(self, image_bytes: bytes, user_id: str, ext: str) -> str:
        """元画像を S3 の uploads/ プレフィックスに一時保存する.

        ライフサイクルルールで自動失効するが、Worker が処理後に即削除する。
        """
        upload_key = f"uploads/{user_id}/{uuid.uuid4().hex}.{ext}"
        self._s3.put_object(
            Bucket=settings.s3_bucket_sprites,
            Key=upload_key,
            Body=image_bytes,
            ContentType=f"image/{'jpeg' if ext == 'jpg' else ext}",
        )
        return upload_key

    async def process_from_upload(
        self, character_id: str, user_id: str, upload_key: str
    ) -> None:
        """S3 の元画像からキャラクター生成を実行し、結果を DB に反映する.

        Worker Lambda から呼び出される。
        背景除去 → 体テンプレート合成 → スプライトシート生成。
        """
        image_bytes = b""
        try:
            # Step 0: 元画像を S3 から取得
            obj = self._s3.get_object(
                Bucket=settings.s3_bucket_sprites, Key=upload_key
            )
            image_bytes = obj["Body"].read()

            # Step 1: 背景除去（メモリ上）
            foreground = self._remove_background(image_bytes)

            # Step 2: キャラクター画像を生成
            character_image = self._resize_character(foreground)

            # Step 3: S3 保存
            s3_key = self._upload_sprite(character_image, user_id)

            # Step 4: 生成成功として DB 更新
            await self._character_repo.mark_completed(character_id, s3_key)
        except Exception as exc:  # noqa: BLE001
            await self._character_repo.mark_failed(character_id, str(exc))
            raise
        finally:
            # 元画像をメモリと S3 から確実に削除（プライバシー保護）
            del image_bytes
            self._delete_original(upload_key)

    def _remove_background(self, image_bytes: bytes) -> bytes:
        """rembg で背景を除去する（メモリ上のみ）."""
        # rembg / onnxruntime は重いため、Worker 実行時のみ遅延インポートする
        from rembg import remove

        return remove(image_bytes)

    def _resize_character(self, styled_bytes: bytes) -> bytes:
        """背景除去済み顔画像をアクション別体テンプレートと合成しスプライトシートを生成する.

        5フレーム構成（各128x192）:
        [0] idle（待機）
        [1] punch（パンチ）
        [2] kick（キック）
        [3] jump（ジャンプ）
        [4] guard（ガード）

        スプライトシートサイズ: 640x192
        """
        face_img = Image.open(io.BytesIO(styled_bytes)).convert("RGBA")

        # フレームサイズ
        frame_w, frame_h = 128, 192
        actions = ["idle", "punch", "kick", "jump", "guard"]

        # スプライトシート生成
        sheet = Image.new("RGBA", (frame_w * len(actions), frame_h), (0, 0, 0, 0))

        for i, action in enumerate(actions):
            body = self._create_body_template(action, frame_w, frame_h)
            frame = self._composite_face_on_body(face_img, body, action)
            sheet.paste(frame, (i * frame_w, 0))

        buffer = io.BytesIO()
        sheet.save(buffer, format="PNG")
        return buffer.getvalue()

    def _create_body_template(
        self, action: str, width: int = 128, height: int = 192
    ) -> Image.Image:
        """アクション別の体テンプレート画像をアセットファイルから読み込む.

        アセットファイルは backend/assets/<character_type>/ に配置。
        Docker イメージ内では /var/task/assets/<character_type>/ に含まれる。
        """
        import pathlib

        # アセットディレクトリ（Lambda 環境: /var/task/assets/、ローカル: ./assets/）
        assets_dir = pathlib.Path(__file__).resolve().parent.parent / "assets" / "fighter"
        if not assets_dir.exists():
            assets_dir = pathlib.Path("/var/task/assets/fighter")

        action_file_map = {
            "idle": "body_idle.png",
            "punch": "body_punch.png",
            "kick": "body_kick.png",
            "jump": "body_jump.png",
            "guard": "body_guard.png",
        }

        filename = action_file_map.get(action, "body_idle.png")
        asset_path = assets_dir / filename

        if asset_path.exists():
            return Image.open(asset_path).convert("RGBA")

        # フォールバック: アセットがない場合はプログラム生成（開発用）
        return self._create_body_template_fallback(action, width, height)

    def _create_body_template_fallback(
        self, action: str, width: int = 128, height: int = 192
    ) -> Image.Image:
        """アセットファイルがない場合のフォールバック（Pillow で簡易生成）."""
        from PIL import ImageDraw

        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)

        gi_color = (30, 80, 180, 255)
        skin_color = (240, 200, 160, 255)
        shoe_color = (80, 50, 30, 255)
        cx = width // 2

        # 簡易的な待機ポーズ（全アクション共通フォールバック）
        draw.rectangle([(cx - 20, 58), (cx + 20, 130)], fill=gi_color)
        draw.rectangle([(cx - 34, 62), (cx - 20, 120)], fill=gi_color)
        draw.ellipse([(cx - 33, 116), (cx - 21, 132)], fill=skin_color)
        draw.rectangle([(cx + 20, 62), (cx + 34, 120)], fill=gi_color)
        draw.ellipse([(cx + 21, 116), (cx + 33, 132)], fill=skin_color)
        draw.rectangle([(cx - 16, 130), (cx - 4, 172)], fill=gi_color)
        draw.rectangle([(cx + 4, 130), (cx + 16, 172)], fill=gi_color)
        draw.ellipse([(cx - 18, 168), (cx - 2, 184)], fill=shoe_color)
        draw.ellipse([(cx + 2, 168), (cx + 18, 184)], fill=shoe_color)

        return canvas

    def _composite_face_on_body(
        self, face: Image.Image, body: Image.Image, action: str = "idle"
    ) -> Image.Image:
        """顔画像を体テンプレートの頭部位置に合成する.

        体テンプレートは首から上がカット済みで下寄せ配置されているため、
        顔は体画像の上部（首の直上）に配置する。
        """
        # 顔を頭部サイズにリサイズ（フレーム幅の40%程度）
        head_size = 48
        face_resized = face.resize(
            (head_size, head_size), Image.Resampling.LANCZOS
        )

        # 体画像の「最初の不透明ピクセル」のY座標を検出して首位置を特定
        body_data = body.getdata()
        first_opaque_y = body.height
        for y in range(body.height):
            for x in range(body.width):
                pixel = body_data[y * body.width + x]
                if pixel[3] > 10:  # ほぼ不透明
                    first_opaque_y = y
                    break
            if first_opaque_y < body.height:
                break

        # 顔を首の直上に配置
        head_x = (body.width - head_size) // 2
        head_y = max(0, first_opaque_y - head_size + 8)  # 少し重ねる

        # 合成
        result = body.copy()
        result.paste(face_resized, (head_x, head_y), face_resized)

        return result

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

    def _delete_original(self, upload_key: str) -> None:
        """元画像を S3 から削除する."""
        try:
            self._s3.delete_object(
                Bucket=settings.s3_bucket_sprites, Key=upload_key
            )
        except Exception:  # noqa: BLE001, S110
            # 削除失敗してもライフサイクルで失効するため握りつぶす
            pass
