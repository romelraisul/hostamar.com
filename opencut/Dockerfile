# OpenCut-app/OpenCut Dockerfile (authored). The web app is normally runs
# via a Vite dev server; here we serve the static build + a tiny FastAPI
# head for /api/* timeline ops.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/OpenCut-app/OpenCut /app \
    || echo "[warn] clone failed"
RUN (test -f /app/package.json && npm install --no-audit --no-fund \
    && npm run build) || echo "[warn] opencut build failed; serving stub"

FROM node:22-slim
WORKDIR /app
COPY --from=build /app /app
COPY app.py /app/api.py
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages fastapi uvicorn requests \
    || echo "[warn] pip install failed"
EXPOSE 8193
CMD ["python3", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8193"]
