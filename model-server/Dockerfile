# Dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime as base

WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Python deps (torch/torchvision already in base)
COPY pyproject.toml /app/
RUN pip install --no-cache-dir fastapi uvicorn[standard] prometheus-client

COPY . /app
ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]