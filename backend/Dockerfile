FROM public.ecr.aws/lambda/python:3.12

# システム依存パッケージ
RUN dnf install -y mesa-libGL glib2 && dnf clean all

# アプリケーションコード全体をコピー（hatchling がパッケージを検出するため）
COPY . ${LAMBDA_TASK_ROOT}

# Python 依存インストール
RUN pip install --no-cache-dir .

# Lambda ハンドラー
CMD ["handler.handler"]
