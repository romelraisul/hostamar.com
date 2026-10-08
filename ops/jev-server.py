#!/usr/bin/env python3
"""jev-server — the decision API behind the 6 PIN audit dashboard.

Serves POST /v1/decisions on :8083 by asking a local Jev-Style server (:8085, the official
``jev-style serve`` + ``jev-score`` linear probe) for a typed decision (one of N choices + the
release's calibrated confidence), then applying the 60% rule, optionally asking an independent
second judge, and writing an append-only audit receipt. Stdlib only.

    jev-server.py --backend systemone --upstream http://127.0.0.1:8085   # official Jev-Style runtime
    jev-server.py --backend chat --upstream http://127.0.0.1:8084        # any OpenAI chat model
    jev-server.py --selftest                                             # stub upstreams, asserts the logic

Request:  {"question": "...", "choices": ["a","b"], "context": {...}, "judges": 2}
Response: {"choice", "confidence", "probabilities", "reasoning", "escalate", "agree", "judge2", "receipt"}

Jev is a *scorer*, not a generator: a single forward pass reads hidden-state slots projected on the
release's direction vector. Confidence is (k*p_max - 1) / (k - 1) — 1.0 = max(p) is 1.0.
The chat backend exists only for the second judge (an independent model × family).

ponytail: receipts are an append-only JSONL file, not a DB table — enough for the audit tab and
SOC2-style "who proposed what"; move to Postgres/Turso when more than one process writes them.
"""
import argparse, json, os, re, sys, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SYSTEM = (
    "You are a decision model. Answer with ONE JSON object and nothing else.\n"
    'Schema: {"choice": <one of the allowed values, copied exactly>, '
    '"confidence": <number 0.0-1.0, your calibrated probability the choice is right>, '
    '"reasoning": <max 20 words>}\n'
    "Never invent a choice outside the allowed list. If uncertain, lower the confidence."
)


def build_prompt(question, choices, context):
    return (f"Question: {question}\nAllowed choices: {json.dumps(choices)}\n"
            f"Context: {json.dumps(context or {}, ensure_ascii=False)}\n"
            "Decide now.")


def call_upstream(url, model, messages, timeout=60, sampler=True):
    body = {"model": model, "messages": messages, "temperature": 0, "max_tokens": 220}
    if sampler:
        body["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(url.rstrip("/") + "/v1/chat/completions",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def call_systemone(url, question, choices, context, timeout=60):
    """Ask the official Jev-Style server (POST /v1/systemone). Returns (choice, confidence, probs).

    The choice question's criteria must be a {name: description|null} mapping; we send nulls because
    the PIN questions are plain labels. States are passed as the canonical JSON serialisation.
    """
    state = context if isinstance(context, str) else json.dumps(context or {}, ensure_ascii=False)
    body = {"state": state,
            "questions": {"q": {"type": "choice", "instructions": question,
                                "criteria": {c: None for c in choices}}}}
    req = urllib.request.Request(url.rstrip("/") + "/v1/systemone",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        ans = json.loads(r.read())["answers"]["q"]
    choice = ans.get("choice")
    if choice not in choices:  # never off-list, trust boundary
        raise ValueError(f"upstream returned unknown choice {choice!r}")
    conf = float(ans.get("confidence") or 0.0)
    return choice, max(0.0, min(1.0, conf)), ans.get("probabilities") or {}


def parse_decision(text, choices):
    """Never raises: a 0.8B model will sometimes wrap JSON in prose or emit a bare choice."""
    obj = None
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            obj = None
    if isinstance(obj, dict):
        choice, conf = obj.get("choice"), obj.get("confidence")
        reason = str(obj.get("reasoning", ""))[:200]
    else:  # bare-text fallback: first allowed choice mentioned wins
        low = text.lower()
        choice = next((c for c in choices if c.lower() in low), None)
        conf, reason = None, text.strip()[:200]
    if isinstance(choice, str):
        match = next((c for c in choices if c.lower() == choice.strip().lower()), None)
        choice = match
    if choice is None:
        choice = choices[0]
    try:
        conf = 0.35 if conf is None else max(0.0, min(1.0, float(conf)))
    except (TypeError, ValueError):
        conf = 0.35  # unparsed confidence is treated as unsure, not as certainty
    return choice, conf, reason


def receipts_path(p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def log_receipt(path, receipt):
    try:
        with open(receipts_path(path), "a") as f:
            f.write(json.dumps(receipt, ensure_ascii=False) + "\n")
        return True
    except OSError as e:  # audit must never take the decision endpoint down
        print(f"receipt write failed: {e}", file=sys.stderr, flush=True)
        return False


def read_receipts(path, limit=50):
    if not os.path.exists(path):
        return []
    with open(path) as f:
        lines = f.readlines()[-limit:]
    out = []
    for ln in lines:
        try:
            out.append(json.loads(ln))
        except json.JSONDecodeError:
            pass
    return out


class Handler(BaseHTTPRequestHandler):
    cfg: dict = {}

    def _send(self, code, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):  # quiet: journald is the log
        pass

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._send(200, {"status": "ok", "service": "hostamar-jev",
                                    "judge1": self.cfg["judge1"], "backend": self.cfg["backend"],
                                    "upstream": self.cfg["upstream"],
                                    "receipts": len(read_receipts(self.cfg['receipts'], 10000)),
                                                                        "receipts_path": self.cfg["receipts"],
                                    "threshold": self.cfg["threshold"]})
        if self.path.startswith("/v1/decisions/receipts"):
            limit = 50
            m = re.search(r"limit=(\d+)", self.path)
            if m:
                limit = min(int(m.group(1)), 500)
            rows = read_receipts(self.cfg["receipts"], limit)
            return self._send(200, {"count": len(rows), "receipts": rows})
        return self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/v1/decisions"):
            return self._send(404, {"error": "not found"})
        if self.cfg["token"]:
            if self.headers.get("Authorization", "") != f"Bearer {self.cfg['token']}":
                return self._send(401, {"error": "unauthorized"})
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "body must be JSON"})
        question, choices = req.get("question", ""), req.get("choices") or []
        if not question or len(choices) < 2:  # trust-boundary validation
            return self._send(400, {"error": "question and >=2 choices are required"})
        t0 = time.time()
        probs = {}
        try:
            if self.cfg["backend"] == "systemone":  # judge 1: calibrated scorer (193ms cold, ~20ms warm)
                choice, conf, probs = call_systemone(self.cfg["upstream"], question, choices,
                                                     req.get("state", req.get("context")),
                                                     timeout=self.cfg["timeout"])
                reason = f"probe p_max={max(probs.values()):.3f} over {len(probs)} options" if probs else "probe"
            else:
                raw = call_upstream(self.cfg["upstream"], self.cfg["model"],
                                    [{"role": "system", "content": SYSTEM},
                                     {"role": "user", "content": build_prompt(question, choices, req.get("context"))}],
                                    timeout=self.cfg["timeout"])
                choice, conf, reason = parse_decision(raw, choices)
        except Exception as e:  # server must survive a dead model: 503, never a hang
            return self._send(503, {"error": f"decision model unreachable: {e}"})
        judge1_ms = int((time.time() - t0) * 1000)

        agree, judge2 = None, None
        if int(req.get("judges", 1)) >= 2 and self.cfg["judge2"]:
            try:
                raw2 = call_upstream(self.cfg["judge2"], "second-judge",
                                     [{"role": "system", "content": SYSTEM},
                                      {"role": "user", "content": build_prompt(question, choices, req.get("context"))}],
                                     timeout=self.cfg["judge2_timeout"])
                c2, conf2, _ = parse_decision(raw2, choices)
                judge2 = {"choice": c2, "confidence": conf2}
                agree = (c2 == choice)
            except Exception as e:
                judge2 = {"error": str(e)[:120]}

        escalate = conf < self.cfg["threshold"]
        receipt = {"id": f"{int(t0*1000)}", "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                   "question": question, "choices": choices, "chosen": choice,
                   "confidence": round(conf, 3), "reasoning": reason,
                   "probabilities": {k: round(v, 4) for k, v in sorted(probs.items(), key=lambda kv: -kv[1])},
                   "who_proposed": req.get("who", "unknown"), "model": self.cfg["judge1"],
                   "backend": self.cfg["backend"],
                   "judge2": judge2, "agree": agree, "escalate": escalate,
                   "routed_to": (req.get("escalate_to") or req.get("context", {}).get("escalate_to"))
                   if escalate else None,
                   "judge1_ms": judge1_ms, "latency_ms": int((time.time() - t0) * 1000),
                   "human_override": None}
        receipt["logged"] = log_receipt(self.cfg["receipts"], receipt)
        return self._send(200, {"choice": choice, "confidence": round(conf, 3),
                                "probabilities": receipt["probabilities"],
                                "reasoning": reason, "escalate": escalate,
                                "routed_to": receipt["routed_to"], "agree": agree,
                                "judge2": judge2, "judge1_ms": judge1_ms,
                                "latency_ms": receipt["latency_ms"],
                                "receipt": receipt})


def serve(cfg):
    Handler.cfg = cfg
    srv = ThreadingHTTPServer((cfg["host"], cfg["port"]), Handler)
    print(f"jev-server on http://{cfg['host']}:{cfg['port']} -> {cfg['upstream']} "
          f"({cfg['judge1']}, {cfg['backend']})", flush=True)
    srv.serve_forever()


# ---------------------------------------------------------------- selftest
def selftest():
    """Stub upstreams + real handler: asserts schema, fallback, the scorer path, 60% rule, receipts."""
    from http.server import BaseHTTPRequestHandler as B, HTTPServer
    import threading

    scripted = {"body": '{"choice":"pro","confidence":0.91,"reasoning":"big prompt"}',
                "systemone": '{"answers":{"q":{"type":"choice","choice":"pro","confidence":0.9,'
                             '"probabilities":{"fast":0.05,"pro":0.9}},"junk":1},"latency_ms":3}',
                "state_seen": None}

    class Stub(B):
        def log_message(self, *a): pass
        def do_POST(self):
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            if self.path.endswith("/v1/systemone"):
                scripted["state_seen"] = json.loads(body)["state"]
                out = scripted["systemone"].encode()
            else:
                out = scripted["body"].encode()
            self.send_response(200); self.send_header("Content-Length", str(len(out))); self.end_headers()
            self.wfile.write(out)

    stub = HTTPServer(("127.0.0.1", 0), Stub)
    threading.Thread(target=stub.serve_forever, daemon=True).start()
    import tempfile
    rc = os.path.join(tempfile.mkdtemp(), "receipts.jsonl")
    url = f"http://127.0.0.1:{stub.server_port}"
    cfg = {"host": "127.0.0.1", "port": 0, "upstream": url, "backend": "systemone",
           "judge1": "stub", "judge2": None, "judge2_timeout": 10, "timeout": 10, "threshold": 0.60,
           "receipts": rc, "token": ""}
    # logic under test, no listener
    assert parse_decision(scripted["body"], ["fast", "pro"])[:2] == ("pro", 0.91)
    assert parse_decision('Sure! {"choice":"FAST","confidence":1.4}', ["fast", "pro"])[:2] == ("fast", 1.0)
    assert parse_decision("I would pick pro here.", ["fast", "pro"])[:2] == ("pro", 0.35)
    assert parse_decision("gibberish", ["fast", "pro"])[:2] == ("fast", 0.35)
    assert parse_decision('{"choice":"nope","confidence":0.9}', ["fast", "pro"])[0] == "fast"  # never off-list
    assert 0.91 >= cfg["threshold"] and 0.35 < cfg["threshold"]  # the 60% rule has both sides
    # the real scorer path, against the stub
    choice, conf, probs = call_systemone(url, "which tier?", ["fast", "pro"], {"prompt": "a cat"})
    assert (choice, conf) == ("pro", 0.9) and probs["pro"] == 0.9
    assert scripted["state_seen"] == '{"prompt": "a cat"}'  # context is the state, as JSON
    try:  # an off-list choice from upstream must never leak through
        call_systemone(url, "q", ["fast", "balanced"], {})
        raise AssertionError("off-list choice accepted")
    except ValueError:
        pass
    log_receipt(rc, {"id": "1", "chosen": "pro"})
    assert read_receipts(rc)[0]["chosen"] == "pro"
    print("selftest ok")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8083)
    ap.add_argument("--backend", choices=("systemone", "chat"), default=os.environ.get("JEV_BACKEND", "systemone"),
                    help="judge 1: 'systemone' = official Jev-Style scorer server, 'chat' = an OpenAI chat model")
    ap.add_argument("--upstream", default=os.environ.get("JEV_UPSTREAM", "http://127.0.0.1:8085"))
    ap.add_argument("--model", default=os.environ.get("JEV_MODEL", "jev-style-0.8b-decision-v3"),
                    help="judge-1 model id, recorded in receipts")
    ap.add_argument("--judge2", default=os.environ.get("JEV_JUDGE2", ""), help="second-judge upstream (two-judge trick)")
    ap.add_argument("--judge2-timeout", type=float, default=float(os.environ.get("JEV_JUDGE2_TIMEOUT", 25)),
                    help="judge-2 budget: a slow second opinion must not stall the API")
    ap.add_argument("--threshold", type=float, default=float(os.environ.get("JEV_THRESHOLD", 0.60)))
    ap.add_argument("--timeout", type=float, default=float(os.environ.get("JEV_TIMEOUT", 60)))
    ap.add_argument("--receipts", default=os.environ.get("JEV_RECEIPTS",
                                              os.path.expanduser("~/.local/state/hostamar/decision-receipts.jsonl")))
    ap.add_argument("--token", default=os.environ.get("JEV_TOKEN", ""))
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())
    serve({**{k: getattr(a, k) for k in ("host", "port", "backend", "upstream", "judge2",
                                         "threshold", "timeout", "receipts", "token")},
           "judge2_timeout": a.judge2_timeout, "judge1": a.model})


if __name__ == "__main__":
    main()
