"""CloudFront オリジン検証ミドルウェア.

CloudFront が付与する X-Origin-Verify ヘッダーを検証し、
直接 Lambda Function URL を叩くリクエストを拒否する。
"""

import hmac

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.config import settings


class OriginVerifyMiddleware(BaseHTTPMiddleware):
    """CloudFront 経由のリクエストのみ許可するミドルウェア."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """リクエストの X-Origin-Verify ヘッダーを検証する."""
        # 検証用シークレットが未設定の場合はスキップ（ローカル開発時）
        if not settings.origin_verify_header:
            return await call_next(request)

        origin_header = request.headers.get("x-origin-verify", "")

        if not hmac.compare_digest(origin_header, settings.origin_verify_header):
            return JSONResponse(
                status_code=403,
                content={"detail": "Forbidden: Direct access not allowed"},
            )

        return await call_next(request)
