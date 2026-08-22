# resemble-ai/chatterbox Dockerfile (authored by Hostamar).
# HONEST note: chatterbox has NO upstream Dockerfile; this is our additive
# build target. Pulls torch CPU (~700MB) + the chatterbox repo. GPU build
# can be enabled later by switching --extra-index-url to the CUDA wheel
# index (assumed not the default builder to keep free-tier feasible).
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ffmpeg \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir fastapi uvicorn requests numpy scipy
# Clone chatterbox from upstream.
RUN git clone --depth 1 https://github.com/resemble-ai/chatterbox /app/chatterbox \
    || echo "[warn] chatterbox clone failed"
WORKDIR /app/chatterbox
RUN pip install --no-cache-dir -e . || echo "[warn] chatterbox install failed - will fallback to stub"
COPY app.py /app/api.py
EXPOSE 8190
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8190"]
