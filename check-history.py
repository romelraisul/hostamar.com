#!/usr/bin/env python3
"""Check ComfyUI history for errors."""
import json, requests

COMFY = "http://localhost:8188"
h = requests.get(f"{COMFY}/history", timeout=5).json()

for pid, entry in sorted(h.items(), key=lambda x: x[1].get("timestamp", 0), reverse=True)[:2]:
    status = entry.get("status", {})
    completed = status.get("completed", False)
    msgs = status.get("messages", [])
    errors = [m for m in msgs if m[0] == "execution_error"]
    outputs = bool(entry.get("outputs", {}))
    print(f"Prompt {pid[:20]}...")
    print(f"  completed={completed}, has_outputs={outputs}")
    for e in errors:
        ei = e[1]
        print(f"  ERROR: node {ei.get('node_id')} ({ei.get('node_type')})")
        print(f"    {ei.get('exception_message','')[:300]}")
