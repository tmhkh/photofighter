"""Cognito JWT トークン検証ユーティリティ (python-jose)."""

import time
from typing import Any

import httpx
from jose import JWTError, jwt

from app.core.config import settings

# Cognito JWKS URL
ISSUER = f"https://cognito-idp.{settings.aws_region}.amazonaws.com/{settings.cognito_user_pool_id}"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"

# JWKS キャッシュ (TTL: 1時間)
_jwks_cache: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_JWKS_CACHE_TTL = 3600


def _get_jwks_sync() -> dict[str, Any]:
    """JWKS を同期的に取得 (キャッシュ付き)."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_CACHE_TTL:
        return _jwks_cache["keys"]

    with httpx.Client() as client:
        res = client.get(JWKS_URL)
        res.raise_for_status()
        jwks = res.json()

    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks


def decode_token(token: str) -> dict[str, Any] | None:
    """Cognito IDトークンをデコードして検証する."""
    try:
        jwks = _get_jwks_sync()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # 対応する公開鍵を検索
        rsa_key: dict[str, Any] | None = None
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = key
                break

        if not rsa_key:
            return None

        # JWT 検証
        payload: dict[str, Any] = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.cognito_allowed_client_ids,
            issuer=ISSUER,
        )
        return payload

    except JWTError:
        return None
