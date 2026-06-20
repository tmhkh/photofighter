"""AWS Lambda ハンドラー（Mangum 経由で FastAPI を実行）."""

from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="off")
