#!/usr/bin/env python3
"""Guard burst check — the runnable proof for the RST-storm fix.

Fires N concurrent + M sequential non-stream chat calls at the guard and fails
(exit 1) if any transport error or 503 appears. 429 is a legitimate shed, not a
failure (the guard is designed to back off, not to break).

  python3 test_burst.py            # 20 concurrent
  NVG_TEST_N=30 python3 test_burst.py
"""
from __future__ import annotations

import asyncio
import collections
import os
import sys
import time

import aiohttp

GUARD = os.environ.get("NVG_URL", "http://127.0.0.1:12436")
MODEL = os.environ.get("NVG_TEST_MODEL", "z-ai/glm-5.3-flash")
N = int(os.environ.get("NVG_TEST_N", "20"))
M = int(os.environ.get("NVG_TEST_M", "5"))
BODY = {"model": MODEL, "messages": [{"role": "user", "content": "say ok"}], "max_tokens": 4}


async def one(sess: aiohttp.ClientSession) -> tuple:
    t0 = time.monotonic()
    try:
        async with sess.post(f"{GUARD}/v1/chat/completions", json=BODY,
                             timeout=aiohttp.ClientTimeout(total=120)) as r:
            await r.read()
            return r.status, time.monotonic() - t0, None
    except Exception as exc:  # noqa: BLE001
        return None, time.monotonic() - t0, f"{type(exc).__name__}: {exc}"


def _report(label: str, res: list) -> int:
    st = collections.Counter(str(r[0]) for r in res)
    lat = sorted(r[1] for r in res)
    errs = [r[2] for r in res if r[2]]
    p = lambda q: lat[min(len(lat) - 1, int(len(lat) * q))]
    print(f"{label}: n={len(res)} statuses={dict(st)} "
          f"p50={p(0.5):.1f}s p95={p(0.95):.1f}s max={lat[-1]:.1f}s")
    for e in errs[:5]:
        print(f"  transport: {e}")
    n503 = sum(1 for r in res if r[0] == 503)
    print(f"  transport_errors={len(errs)} 503s={n503} 429s={st.get('429', 0)}")
    return 1 if (errs or n503) else 0


async def main() -> int:
    # force_close to match the guard's own outbound setting; if the failure were
    # stale-keepalive reuse it would not reproduce either way.
    conn = aiohttp.TCPConnector(force_close=True)
    async with aiohttp.ClientSession(connector=conn) as sess:
        res = await asyncio.gather(*(one(sess) for _ in range(N)))
        rc = _report(f"burst  {N} concurrent", res)
        seq = [await one(sess) for _ in range(M)]
        rc |= _report(f"serial {M} sequential", seq)
    print("PASS" if rc == 0 else "FAIL (transport error or 503)")
    return rc


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
