# server.py
from fastapi import FastAPI, Request
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import time

app = FastAPI()
REQUESTS = Counter('hostamar_requests_total', 'Total requests')

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/predict")
async def predict(req: Request):
    REQUESTS.inc()
    data = await req.json()
    # run your model inference here (sync or async)
    # result = model.predict(data)
    time.sleep(0.1)  # placeholder
    return {"result":"ok"}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)