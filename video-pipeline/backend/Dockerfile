# =============================================================================
# Backend image — builds BOTH the api-gateway and the worker from one base.
# Targets: docker compose builds `gateway` (uvicorn api_gateway:app) and the
# default `worker` (python worker.py). Compose references target: gateway.
# =============================================================================
FROM python:3.11-slim AS base
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git-lfs ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY common ./common
COPY api_gateway.py worker.py ./
COPY workflows ./workflows

# gateway variant
FROM base AS gateway
EXPOSE 8000
CMD ["uvicorn", "api_gateway:app", "--host", "0.0.0.0", "--port", "8000"]

# worker variant (default)
FROM base AS worker
CMD ["python", "worker.py"]
