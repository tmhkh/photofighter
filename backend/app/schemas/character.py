"""キャラクタースキーマ."""

from pydantic import BaseModel


class CharacterResponse(BaseModel):
    """キャラクターレスポンス."""

    character_id: str
    user_id: str
    name: str
    sprite_url: str
    style: str
    created_at: str
