"""ゲームデータエンドポイント."""

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id
from app.schemas.game import BattleResultRequest, BattleResultResponse, StageResponse

router = APIRouter()


@router.get("/stages", response_model=list[StageResponse])
async def list_stages() -> list[StageResponse]:
    """利用可能なステージ一覧を取得する."""
    return [
        StageResponse(
            stage_id="stage-1",
            name="鬼ヶ原",
            description="可愛いオニが待ち構える最初のステージ",
            enemy_type="oni",
            difficulty="normal",
        )
    ]


@router.post("/results", response_model=BattleResultResponse)
async def record_result(
    request: BattleResultRequest,
    user_id: str = Depends(get_current_user_id),
) -> BattleResultResponse:
    """バトル結果を記録する."""
    return BattleResultResponse(
        user_id=user_id,
        stage_id=request.stage_id,
        result=request.result,
        score=request.score,
    )


@router.get("/results", response_model=list[BattleResultResponse])
async def get_results(
    user_id: str = Depends(get_current_user_id),
) -> list[BattleResultResponse]:
    """自分の戦績を取得する."""
    return []
