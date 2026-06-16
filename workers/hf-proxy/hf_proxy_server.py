#!/usr/bin/env python3
"""
Hostamar HF Proxy — DuckDNS-like local proxy.
Forwards all requests to api-inference.huggingface.co with the proper HF token.

Runs on localhost:8080 (or PORT env), exposed via cloudflared tunnel as hf.hostamar.com.

Install:
  pip install flask requests
  python3 hf_proxy.py

Or run with systemd / supervisor.
"""
import os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request, urllib.error

HF_TOKEN = os.environ.get("HF_TOKEN", "hf_mie...OeSd")
HF_BASE = "https://api-inference.huggingface.co"
PORT = int(os.environ.get("PORT", "8080"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info").lower()

SKIP_REQ = {"host", "connection", "content-length", "transfer-encoding",
            "te", "trailer", "upgrade", "proxy-authorization", "proxy-authenticate"}

class ProxyHandler(BaseHTTPRequestHandler):
    def _copy_headers(self, src):
        out = {}
        for k, v in src.items():
            if k.lower() not in SKIP_REQ:
                out[k] = v
        return out

    def do_request(self):
        path = self.path
        url = HF_BASE + path
        body = self.rfile.read(int(self.headers.get("Content-Length", "0") or "0")) \
            if self.command in ("POST", "PUT", "PATCH") else None

        headers = self._copy_headers(self.headers)
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

        try:
            req = urllib.request.Request(url, data=body, method=self.command, headers=headers)
            with urllib.request.urlopen(req, timeout=300) as resp:
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() in ("transfer-encoding", "connection", "content-encoding"):
                        continue
                    self.send_header(k, v)
                self.end_headers()
                while True:
                    chunk = resp.read(65536)
                    if not chunk: break
                    self.wfile.write(chunk)
        except urllib.error.HTTPError as e:
            try:
                body_bytes = e.read()
            except Exception:
                body_bytes = str(e).encode()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body_bytes)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error":"{type(e).__name__}: {e}"}}'.encode())

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_request

    def log_message(self, fmt, *args):
        if LOG_LEVEL == "debug":
            sys.stderr.write(f"{self.address_string()} - {fmt % args}\n")
        elif LOG_LEVEL == "info":
            sys.stderr.write(f"{self.command} {self.path} -> {HF_BASE}{self.path}\n")

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"HF proxy listening on 0.0.0.0:{PORT} -> {HF_BASE}", file=sys.stderr)
    print(f"  Token: {HF_TOKEN[:8]}...", file=sys.stderr)
    server.serve_forever()
