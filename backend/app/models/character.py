"""キャラクターリポジトリ."""

import uuid
from datetime import UTC, datetime

import boto3

from app.core.config import settings


class CharacterRepository:
    """DynamoDB キャラクターテーブルへのアクセスを提供する."""

    def __init__(self) -> None:
        """DynamoDB リソースを初期化する."""
        self._dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
        self._table = self._dynamodb.Table(settings.dynamodb_table_characters)

    async def create(
        self,
        user_id: str,
        name: str,
        sprite_s3_key: str = "",
        style: str = "fighter",
        status: str = "processing",
    ) -> dict:
        """キャラクターレコードを作成する."""
        character_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()
        item = {
            "character_id": character_id,
            "user_id": user_id,
            "name": name,
            "sprite_s3_key": sprite_s3_key,
            "style": style,
            "status": status,
            "error_message": "",
            "created_at": now,
        }
        self._table.put_item(Item=item)
        return item

    async def get(self, character_id: str) -> dict | None:
        """キャラクターを取得する."""
        response = self._table.get_item(Key={"character_id": character_id})
        return response.get("Item")

    async def list_by_user(self, user_id: str) -> list[dict]:
        """ユーザーのキャラクター一覧を取得する."""
        response = self._table.scan(
            FilterExpression="user_id = :uid",
            ExpressionAttributeValues={":uid": user_id},
        )
        return response.get("Items", [])

    async def delete(self, character_id: str) -> None:
        """キャラクターを削除する."""
        self._table.delete_item(Key={"character_id": character_id})

    async def mark_completed(self, character_id: str, sprite_s3_key: str) -> None:
        """生成成功としてキャラクターを更新する."""
        self._table.update_item(
            Key={"character_id": character_id},
            UpdateExpression="SET #s = :s, sprite_s3_key = :k",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "completed",
                ":k": sprite_s3_key,
            },
        )

    async def mark_failed(self, character_id: str, error_message: str) -> None:
        """生成失敗としてキャラクターを更新する."""
        self._table.update_item(
            Key={"character_id": character_id},
            UpdateExpression="SET #s = :s, error_message = :e",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "failed",
                ":e": error_message[:500],
            },
        )

    async def get_monthly_generation_count(self, user_id: str) -> int:
        """今月の生成回数を取得する（失敗分は除く）."""
        characters = await self.list_by_user(user_id)
        current_month = datetime.now(UTC).strftime("%Y-%m")
        count = sum(
            1
            for c in characters
            if c.get("created_at", "").startswith(current_month) and c.get("status") != "failed"
        )
        return count
