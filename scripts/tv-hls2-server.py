#!/usr/bin/env python3
"""Tiny CORS-enabled static server for the VP9/Opus HLS variant."""
import http.server, socketserver, os, sys

DIR = "/home/romel/hostamar-build/docker/tv-station/hls2"

class CORS(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

class ThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

os.chdir(DIR)
with ThreadingServer(("127.0.0.1", 8090), CORS) as httpd:
    httpd.serve_forever()
