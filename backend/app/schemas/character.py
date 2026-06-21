"""キャラクタースキーマ."""

from pydantic import BaseModel


class CharacterResponse(BaseModel):
    """キャラクターレスポンス."""

    character_id: str
    user_id: str
    name: str
    sprite_url: str = ""
    style: str = "fighter"
    status: str = "processing"
    error_message: str = ""
    created_at: str
