"""ユーザーリポジトリ."""

from datetime import UTC, datetime

import boto3

from app.core.config import settings


class UserRepository:
    """DynamoDB ユーザーテーブルへのアクセスを提供する.

    認証は共通認証基盤 (Cognito) に委任。
    このテーブルはアプリ固有のユーザーデータ (生成回数制限等) を管理する。
    user_id は Cognito JWT の sub 値を使用する。
    """

    def __init__(self) -> None:
        """DynamoDB リソースを初期化する."""
        self._dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
        self._table = self._dynamodb.Table(settings.dynamodb_table_users)

    async def get_or_create(self, user_id: str, email: str) -> dict:
        """ユーザーを取得、存在しなければ作成する.

        Cognito で認証済みのユーザーが初回アクセス時に自動作成される。
        """
        existing = await self.get(user_id)
        if existing:
            return existing

        now = datetime.now(UTC).isoformat()
        item = {
            "user_id": user_id,
            "email": email,
            "created_at": now,
            "generation_count_monthly": 0,
            "generation_reset_month": datetime.now(UTC).strftime("%Y-%m"),
        }
        self._table.put_item(Item=item)
        return item

    async def get(self, user_id: str) -> dict | None:
        """ユーザーIDからユーザーを取得する."""
        response = self._table.get_item(Key={"user_id": user_id})
        return response.get("Item")
