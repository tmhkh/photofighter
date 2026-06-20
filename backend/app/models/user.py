"""ユーザーリポジトリ.

Cognito が認証・ユーザー管理を担当するため、
このテーブルはアプリ固有のプロフィール情報のみ保持する。
user_id は Cognito の sub（UUID）を使用する。
"""

from datetime import UTC, datetime

import boto3

from app.core.config import settings


class UserRepository:
    """DynamoDB ユーザープロフィールテーブルへのアクセスを提供する."""

    def __init__(self) -> None:
        """DynamoDB リソースを初期化する."""
        self._dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
        self._table = self._dynamodb.Table(settings.dynamodb_table_users)

    async def get_or_create(self, user_id: str) -> dict:
        """ユーザープロフィールを取得。なければ作成する.

        Cognito 認証済みユーザーが初回アクセス時に自動作成される。
        """
        existing = await self.get(user_id)
        if existing:
            return existing

        now = datetime.now(UTC).isoformat()
        item = {
            "user_id": user_id,
            "created_at": now,
            "generation_count_monthly": 0,
            "generation_reset_month": datetime.now(UTC).strftime("%Y-%m"),
        }
        self._table.put_item(Item=item)
        return item

    async def get(self, user_id: str) -> dict | None:
        """ユーザーIDからプロフィールを取得する."""
        response = self._table.get_item(Key={"user_id": user_id})
        return response.get("Item")
