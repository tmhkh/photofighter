"""非同期キャラクター生成ワーカーの Lambda ハンドラー.

API Lambda から InvocationType="Event" で非同期 invoke される。
イベントペイロード: {"character_id": str, "user_id": str, "upload_key": str}
"""

import asyncio
from typing import Any

from app.services.character_generator import CharacterGeneratorService

_service = CharacterGeneratorService()


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """生成処理を実行する."""
    character_id = event["character_id"]
    user_id = event["user_id"]
    upload_key = event["upload_key"]

    asyncio.run(
        _service.process_from_upload(
            character_id=character_id,
            user_id=user_id,
            upload_key=upload_key,
        )
    )

    return {"character_id": character_id, "status": "completed"}
