"""ユーザーリポジトリ."""

import uuid
from datetime import UTC, datetime

import boto3

from app.core.config import settings


class UserRepository:
    """DynamoDB ユーザーテーブルへのアクセスを提供する."""

    def __init__(self) -> None:
        """DynamoDB リソースを初期化する."""
        self._dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
        self._table = self._dynamodb.Table(settings.dynamodb_table_users)

    async def create(self, email: str, password_hash: str) -> dict:
        """ユーザーを作成する."""
        user_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()
        item = {
            "user_id": user_id,
            "email": email,
            "password_hash": password_hash,
            "created_at": now,
            "generation_count_monthly": 0,
            "generation_reset_month": datetime.now(UTC).strftime("%Y-%m"),
        }
        self._table.put_item(Item=item)
        return item

    async def get_by_email(self, email: str) -> dict | None:
        """メールアドレスからユーザーを取得する."""
        response = self._table.scan(
            FilterExpression="email = :email",
            ExpressionAttributeValues={":email": email},
        )
        items = response.get("Items", [])
        return items[0] if items else None

    async def get(self, user_id: str) -> dict | None:
        """ユーザーIDからユーザーを取得する."""
        response = self._table.get_item(Key={"user_id": user_id})
        return response.get("Item")
