#!/usr/bin/env python3
"""
End-to-end smoke test — verify the gpu-worker actually generates a video.

Usage (paste the token into your SHELL, never in chat):
  HUGGINGFACE_API_TOKEN=${HF_TOKEN:-} python3 scripts/smoke-test-video.py "a dhaka sunset cinematic"
  HUGGINGFACE_API_TOKEN=${HF_TOKEN:-} python3 scripts/smoke-test-video.py   # uses default prompt

Exit codes:
  0 = success
  1 = bad args / no docker / no token
  2 = enqueue failed
  3 = generation failed (see error printed below)
  4 = timeout

Requires: docker ps works (the worker container must already be running).
"""
import os
import sys
import time
import subprocess
import secrets
import urllib.request


CUSTOMER_ID = "cust-smoke-001"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def psql(sql: str, *, fmt: str = "-tA") -> str:
    r = subprocess.run(
        ["docker", "exec", "hostamar-postgres", "psql", "-U", "hostamar", "-d", "hostamar", fmt, "-c", sql],
        capture_output=True, text=True,
    )
    return r.stdout.strip()


def exec_in(container: str, *args: str) -> str:
    return subprocess.run(
        ["docker", "exec", container, *args], capture_output=True, text=True
    ).stdout


def wait_for_video_row(video_id: str, timeout: int = 240) -> dict:
    """Poll the DB every 5s until the video's status moves off 'processing'
    or we hit timeout. Returns the final row as a dict."""
    deadline = time.time() + timeout
    prev = None
    while time.time() < deadline:
        row = psql(
            f"SELECT status, COALESCE(url,''), COALESCE(provider,''), COALESCE(\"thumbnailUrl\",''), "
            f"COALESCE(error,''), COALESCE(duration,0) FROM \"Video\" WHERE id='{video_id}';",
        )
        status, url, provider, thumb, err, dur = (row.split("|") + [""] * 6)[:6]
        if status != prev:
            log(f"  DB status={status or '<gone>'}  url={url or '-'}  err={err[:60] if err else '-'}")
            prev = status
        if status in ("completed", "failed"):
            return {
                "status": status,
                "url": url,
                "provider": provider,
                "thumbnailUrl": thumb,
                "error": err,
                "duration": int(dur or 0),
            }
        time.sleep(5)
    return {"status": "timeout", "url": "", "provider": "", "thumbnailUrl": "", "error": "", "duration": 0}


def main(prompt: str | None) -> int:
    token = os.getenv("HUGGINGFACE_API_TOKEN", "")
    prompt = prompt or os.getenv("PROMPT", "a beautiful dhaka sunset cinematic, vibrant colors")
    if not token:
        log("ERROR: set HUGGINGFACE_API_TOKEN in your shell, e.g.:")
        log("  HUGGINGFACE_API_TOKEN=${HF_TOKEN:-} python3 scripts/smoke-test-video.py")
        return 1
    if not prompt.strip():
        log("ERROR: prompt is empty")
        return 1

    # 0. Sanity
    if subprocess.run(["docker", "ps"], capture_output=True).returncode != 0:
        log("docker not reachable from this shell")
        return 1
    if subprocess.run(["docker", "inspect", "hostamar-gpu-worker"],
                      capture_output=True).returncode != 0:
        log("hostamar-gpu-worker not running")
        return 1

    video_id = f"smoke_{secrets.token_hex(4)}_{int(time.time())}"
    log(f"video id: {video_id}")
    log(f"prompt:   {prompt}")

    # 1. Seed video row in DB (status='processing')
    log("inserting seed row in Postgres...")
    safe_prompt = prompt.replace("'", "''")
    safe_title = f"Smoke {video_id}"
    insert_sql = (
        f"INSERT INTO \"Video\" (id, \"customerId\", title, script, prompt, duration, format, "
        f"resolution, url, topic, status, \"createdAt\", \"updatedAt\") "
        f"VALUES ('{video_id}', '{CUSTOMER_ID}', '{safe_title}', '', '{safe_prompt}', "
        f"5, 'mp4', '1080p', '', '', 'processing', NOW(), NOW()) "
        f"ON CONFLICT (id) DO UPDATE SET status='processing', error=NULL, url='';"
    )
    out = psql(insert_sql)
    if "INSERT" not in out and "UPDATE" not in out:
        log(f"DB insert may have failed: {out[:200]}")
        return 1

    # 2. Enqueue in Redis via the gpu-worker container
    log("enqueueing BullMQ job (running enqueue script inside worker)...")
    enq_script_path = "/tmp/enqueue-test.py"
    # Copy our enqueue helper into the container if missing
    host_path = "/mnt/c/Users/romel/hostamar-local/flociops-assistant/scripts/enqueue-test-job.py"
    if not os.path.exists(host_path):
        log(f"missing {host_path}")
        return 1
    subprocess.run(
        ["docker", "cp", host_path, f"hostamar-gpu-worker:{enq_script_path}"],
        check=True, capture_output=True,
    )
    r = subprocess.run(
        ["docker", "exec", "hostamar-gpu-worker", "bash", "-lc",
         f"REDIS_URL=redis://redis:6379 python3 {enq_script_path} '{video_id}' '{safe_prompt}'"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        log(f"enqueue failed: {r.stderr}")
        return 2
    job_id = ""
    for line in r.stdout.splitlines():
        if '"jobId":' in line:
            job_id = line.split(":", 1)[1].strip().strip(",").strip('"')
            break
    log(f"  enqueued as BullMQ jobId={job_id or '?'}")

    # 3. Poll DB for status change
    log("polling DB every 5s (max 4 min)...")
    final = wait_for_video_row(video_id, timeout=240)

    if final["status"] == "timeout":
        log("\nTIMEOUT — last 25 lines of worker log:")
        subprocess.run(["docker", "logs", "hostamar-gpu-worker", "--tail", "25"])
        return 4

    if final["status"] == "failed":
        log(f"\nJOB FAILED")
        log(f"  provider: {final['provider'] or '-'}")
        log(f"  error:    {final['error'][:400]}")
        log("\nWorker tail:")
        subprocess.run(["docker", "logs", "hostamar-gpu-worker", "--tail", "25"])
        # diagnose common causes
        if "HUGGINGFACE_API_TOKEN is not set" in final["error"]:
            log("\n→ Your token didn't reach the container. "
                "Did you put it in .env.local AND force-recreate gpu-worker?")
        if "401" in final["error"] or "Unauthorized" in final["error"]:
            log("\n→ 401 means token is invalid or doesn't have Inference API scope.")
        return 3

    # success
    log(f"\n✅ SUCCESS — video generated")
    log(f"  status:    {final['status']}")
    log(f"  provider:  {final['provider'] or '-'}")
    log(f"  url:       {final['url']}")
    log(f"  duration:  {final['duration']}s")
    if final["url"].startswith("/"):
        full = f"http://localhost:3000{final['url']}"
        log(f"  browse:    {full}")
        try:
            r = urllib.request.urlopen(full, timeout=5)
            sz = r.headers.get("content-length", "?")
            log(f"  http GET:  {r.status}  content-length={sz}")
        except urllib.error.HTTPError as e:
            log(f"  http GET:  {e}  — file might still be propagating to CDN")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
