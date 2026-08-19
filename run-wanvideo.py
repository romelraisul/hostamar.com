#!/usr/bin/env python3
"""Submit WanVideo T2V workflow and wait."""
import json, requests, time, subprocess, sys

COMFY = "http://localhost:8188"
WF_PATH = "/home/romel/hostamar-build/video-pipeline-lowvram/workflows/lowvram/wanvideo-t2v-celebration.json"

wf = json.load(open(WF_PATH))
wf["7"]["inputs"]["positive_prompt"] = (
    "Eid celebration, family gathering, festive atmosphere, "
    "people hugging and smiling, warm golden lighting, "
    "cinematic quality, emotional happy moment, high quality video"
)

print("Submitting WanVideo celebration workflow...")
sys.stdout.flush()

r = requests.post(f"{COMFY}/api/prompt", json={"prompt": wf}, timeout=30)
if r.status_code != 200:
    print(f"ERROR {r.status_code}: {r.text[:600]}")
    sys.exit(1)

pid = r.json()["prompt_id"]
print(f"Submitted! ID: {pid}")
print(f"WanVideo 14B Q4_0 + CLIP | 480x480x49 frames | 30 steps")
sys.stdout.flush()

start = time.time()
got_output = False
for i in range(40):
    time.sleep(15)
    try:
        h = requests.get(f"{COMFY}/history/{pid}", timeout=20)
        hist = h.json()
        if pid in hist and hist[pid].get("outputs"):
            elapsed = time.time() - start
            print(f"\nCOMPLETE in {elapsed:.0f}s!")
            outputs = hist[pid].get("outputs", {})
            for node_id, node_out in outputs.items():
                for mtype, files in node_out.items():
                    if isinstance(files, list):
                        for f in files:
                            if isinstance(f, dict):
                                fn = f.get("filename", "?")
                                ft = f.get("type", "?")
                                print(f"  Output: {ft}/{f.get('subfolder','')}{fn}")
                                if ft == "output":
                                    got_output = True
            break
        elif pid in hist:
            msgs = hist[pid].get("status", {}).get("messages", [])
            for msg in msgs:
                if msg[0] == "execution_error":
                    err = msg[1]
                    print(f"\nERROR node {err.get('node_id','?')} ({err.get('node_type','?')})")
                    print(f"  {err.get('exception_message','')[:200]}")
                    sys.exit(1)
        else:
            elapsed = time.time() - start
            if elapsed > 60:
                print(f"  T+{elapsed:.0f}s generating...")
    except Exception as e:
        elapsed = time.time() - start
        if elapsed > 30:
            print(f"  T+{elapsed:.0f}s poll: {str(e)[:60]}")
    sys.stdout.flush()

total = time.time() - start
if got_output:
    print(f"\nTotal: {total:.0f}s")
    out = subprocess.run(
        ["docker", "exec", "hostamar-comfyui-lowvram",
         "sh", "-c", "ls -lt /root/ComfyUI/output/ | head -10"],
        capture_output=True, text=True, timeout=10
    )
    files = [l.split()[-1] for l in out.stdout.strip().split("\n")[1:] if l.strip()]
    print(f"Output: {files}")
    if files:
        src = f"hostamar-comfyui-lowvram:/root/ComfyUI/output/{files[0]}"
        dst = f"/home/romel/hostamar-build/video-output/{files[0]}"
        r = subprocess.run(["docker", "cp", src, dst], capture_output=True, timeout=10)
        print(f"Copied: {dst}")
        print(f"Audio file ready for overlay: ~/hostamar-build/video-output/celebration_audio.wav")
else:
    print(f"\nNo output after {total:.0f}s")
