#!/usr/bin/env python3
"""Tiny CORS-enabled static server for the VP9/Opus HLS variant.

Caching is per file type, and getting this wrong is what made the stream buffer:

  .m3u8  -> no-cache          the playlist is rewritten every ~4s; caching it
                              freezes playback on a stale segment list.
  .m4s/.mp4/.ts/.vtt -> long  segments are IMMUTABLE (segment N of this run never
                              changes), so Cloudflare can cache them at the edge.

Previously every response carried `no-cache`, so cf-cache-status was DYNAMIC for
segments too: Cloudflare never cached anything and every viewer, everywhere,
pulled each segment through the Cloudflare Tunnel from the PC. That is the
buffering. With immutable segments cached at the edge, repeat viewers are served
by Cloudflare and the tunnel only carries cache misses.
"""
import http.server, socketserver, os

DIR = "/home/romel/hostamar-build/docker/tv-station/hls2"

# immutable media => cache hard at the edge and in the browser
LONG_TTL = ("public, max-age=31536000, immutable")
DYN_TTL = "no-cache"


class CORS(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        path = self.path.split("?")[0].lower()
        if path.endswith(".m3u8"):
            self.send_header("Cache-Control", DYN_TTL)
        else:
            self.send_header("Cache-Control", LONG_TTL)
        super().end_headers()

    def log_message(self, *a):  # keep the journal quiet
        pass


class ThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


os.chdir(DIR)
with ThreadingServer(("127.0.0.1", 8090), CORS) as httpd:
    httpd.serve_forever()
