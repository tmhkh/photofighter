"""Cognito JWT トークン検証ユーティリティ."""

import json
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient

from app.core.config import settings


@lru_cache(maxsize=1)
def _get_jwk_client() -> PyJWKClient:
    """Cognito JWKS エンドポイントの JWK クライアントを取得する."""
    jwks_url = (
        f"https://cognito-idp.{settings.aws_region}.amazonaws.com"
        f"/{settings.cognito_user_pool_id}/.well-known/jwks.json"
    )
    return PyJWKClient(jwks_url)


def decode_cognito_token(token: str) -> dict[str, Any] | None:
    """Cognito JWT トークンを検証・デコードする.

    Returns:
        検証済みペイロード。無効な場合は None。
    """
    try:
        jwk_client = _get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=(
                f"https://cognito-idp.{settings.aws_region}.amazonaws.com"
                f"/{settings.cognito_user_pool_id}"
            ),
            options={
                "verify_aud": False,  # Cognito access token には aud がない
                "verify_exp": True,
            },
        )

        # client_id の検証（access token は client_id、id token は aud）
        client_id = payload.get("client_id") or payload.get("aud")
        if client_id != settings.cognito_client_id:
            return None

        return payload
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        return None
