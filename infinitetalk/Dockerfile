# MeiGen-AI/InfiniteTalk Dockerfile (authored). Talking-head lip-sync.
FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    || echo "[warn] torch install failed"
RUN pip install --no-cache-dir fastapi uvicorn requests numpy opencv-python-headless
RUN git clone --depth 1 https://github.com/MeiGen-AI/InfiniteTalk /app/InfiniteTalk \
    || echo "[warn] clone failed"
COPY app.py /app/api.py
EXPOSE 8192
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8192"]
