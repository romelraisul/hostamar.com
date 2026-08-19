#!/usr/bin/env python3
"""Quick status check."""
import subprocess, os

# GPU
r = subprocess.run(
    ['nvidia-smi', '--query-gpu=memory.used,memory.total,utilization.gpu,temperature.gpu',
     '--format=csv,noheader'],
    capture_output=True, text=True, timeout=5
)
print(f"GPU: {r.stdout.strip() if r.stdout.strip() else r.stderr[:60]}")

# RAM
r = subprocess.run(['free', '-h'], capture_output=True, text=True, timeout=5)
for line in r.stdout.strip().split('\n'):
    print(f"  {line}")

# Swap
r = subprocess.run(['swapon', '--show'], capture_output=True, text=True, timeout=5)
print(f"Swap: {r.stdout.strip() or 'none'}")

# Check if ComfyUI prompt is still running
import requests
try:
    q = requests.get("http://localhost:8188/queue", timeout=5)
    qj = q.json()
    running = len(qj.get("queue_running", []))
    pending = len(qj.get("queue_pending", []))
    print(f"Queue: {running} running, {pending} pending")
except Exception as e:
    print(f"ComfyUI check: {e}")
