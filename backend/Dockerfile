FROM public.ecr.aws/lambda/python:3.12

# システム依存パッケージ
RUN dnf install -y mesa-libGL glib2 && dnf clean all

# Python 依存
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# アプリケーションコード
COPY . ${LAMBDA_TASK_ROOT}

# Lambda ハンドラー
CMD ["handler.handler"]
