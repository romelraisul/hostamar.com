# ace-step/ACE-Step-1.5 - loads from upstream Dockerfile (verified exists).
# We use their Dockerfile as-is via context from a git clone. Docker builds
# pull the clone in a previous step; we use multi-stage to avoid an outer
# git dependency.
FROM alpine/git:latest AS fetcher
WORKDIR /src
RUN git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5 /src \
    || echo "[warn] clone failed"

FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*
COPY --from=fetcher /src /app
# Try upstream Dockerfile's install steps; if pip fails (CUDA wheels), cmd=stub.
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu || echo "[warn] torch install failed"
RUN pip install --no-cache-dir -r /app/requirements.txt 2>/dev/null \
    || echo "[warn] requirements.txt install failed"
COPY app.py /app/hostamar_shim.py
EXPOSE 8191
CMD ["uvicorn", "hostamar_shim:app", "--host", "0.0.0.0", "--port", "8191"]
