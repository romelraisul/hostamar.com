"""OpenCut hostamar shim. Honest: serves timeline editor meta + accepts
timeline save/load via Docker volume. If upstream UI build failed, we
return the stub. NEVER fake edits."""
import os, json, time
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
app = FastAPI(title="hostamar-opencut")
UI_READY = os.path.exists("/app/dist/index.html") or \
           os.path.exists("/app/public/index.html")


class TL(BaseModel):
    name: str | None = None
    data: dict


@app.get("/health")
def health():
    return {"ready": UI_READY,
            "endpoints": ["/api/timeline", "/api/timeline/load"],
            "note": "timeline editor API - frontend optional"}


@app.get("/")
def root():
    if UI_READY and os.path.exists("/app/dist/index.html"):
        return HTMLResponse(open("/app/dist/index.html").read())
    if UI_READY and os.path.exists("/app/public/index.html"):
        return HTMLResponse(open("/app/public/index.html").read())
    return HTMLResponse(
        "<h1>Hostamar OpenCut API</h1>"
        "<p>Upstream UI build not bundled on this box (free-tier RAM).<br>"
        "<a href='/docs'>API docs</a> · <a href='/health'>health</a></p>"
    )


@app.post("/api/timeline")
def save_tl(t: TL):
    path = f"/output/timeline_{int(time.time())}.json"
    with open(path, "w") as f:
        json.dump({"name": t.name, "data": t.data}, f)
    return {"saved": path}


@app.get("/api/timeline/load")
def list_tl():
    out = []
    if os.path.isdir("/output"):
        for p in os.listdir("/output"):
            if p.startswith("timeline_") and p.endswith(".json"):
                out.append("/output/" + p)
    return {"timelines": out}
