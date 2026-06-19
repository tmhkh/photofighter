"""ゲームデータスキーマ."""

from pydantic import BaseModel


class StageResponse(BaseModel):
    """ステージ情報レスポンス."""

    stage_id: str
    name: str
    description: str
    enemy_type: str
    difficulty: str


class BattleResultRequest(BaseModel):
    """バトル結果リクエスト."""

    stage_id: str
    character_id: str
    result: str  # "win" | "lose"
    score: int


class BattleResultResponse(BaseModel):
    """バトル結果レスポンス."""

    user_id: str
    stage_id: str
    result: str
    score: int
