# Base image: slim Python 3.11. ~150MB download, no CUDA wheels baked in.
# LTX-Video MVP shim: a FastAPI app that documents the input contract and
# forwards every POST /generate to the running lowvram ComfyUI workflow
# (/api/prompt endpoint) for LTX-Video rendering. Real model work happens
# in ComfyUI - this container is only the API surface.
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn requests
COPY app.py /app/app.py
EXPOSE 8190
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8190"]
