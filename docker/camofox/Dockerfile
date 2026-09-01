FROM daijro/camoufox:latest

# V28 — Hostamar anti-detect browser shim.
# Base image ships Camoufox (Firefox + fingerprint spoofing, C++ patches).
# browser-use drives it; FastAPI exposes POST /v1/browse {task} for
# app/api/browser/* contracts. Keep it small: no repo vendoring.

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir browser-use fastapi uvicorn

WORKDIR /app
COPY main.py /app/main.py

EXPOSE 3000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
