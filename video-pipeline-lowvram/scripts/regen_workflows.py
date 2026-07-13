#!/usr/bin/env python3
"""Regenerate + validate all lowvram workflows against the live ComfyUI at :8199."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import wf_convert as W

ROOT = "/home/romel/hostamar-build/video-pipeline-lowvram/"
WFDIR = ROOT + "workflows/lowvram/"
DOCKER = "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
ENV = {k: v for k, v in os.environ.items() if k != "DOCKER_HOST"}

W._OBJ = W.load_obj()
OBJ = W._OBJ
print("object_info node types:", len(OBJ))

# ---- ensure Test C input assets exist ----
subprocess.run([DOCKER, "exec", "comfyui-lowvram", "cp",
                "/root/ComfyUI/input/example.png", "/root/ComfyUI/input/woman.png"],
               env=ENV, capture_output=True)


def c_fixup(prompt, nodes, links, resolve):
    for nid in [n for n, nd in list(prompt.items()) if nd["class_type"] == "VHS_VideoCombine"]:
        orig = nodes[int(nid)]
        imgs = aud = None
        for i in orig.get("inputs", []):
            lk = i.get("link")
            if lk in links:
                s = resolve(links[lk][1], links[lk][2])
                if i["name"] == "images":
                    imgs = [s[0], s[1]]
                if i["name"] == "audio":
                    aud = [s[0], s[1]]
        prompt[nid] = {"class_type": "CreateVideo",
                       "inputs": {"images": imgs, "fps": 25.0}}
        if aud:
            prompt[nid]["inputs"]["audio"] = aud
        prompt["9001"] = {"class_type": "SaveVideo",
                          "inputs": {"video": [nid, 0], "filename_prefix": "wan_infinitetalk",
                                     "format": "mp4", "codec": "h264"}}
    for nid, node in prompt.items():
        ct = node["class_type"]
        if ct == "MultiTalkWav2VecEmbeds":
            node["inputs"]["fps"] = 25.0
            if node["inputs"].get("multi_audio_type") not in ("para", "add"):
                node["inputs"]["multi_audio_type"] = "para"
        if ct == "LoadAudio":
            node["inputs"]["audio"] = "sample_voice.wav"
        if ct == "LoadImage":
            node["inputs"]["image"] = "woman.png"


def savevideo_fixup(prompt, nodes, links, resolve):
    for node in prompt.values():
        if node["class_type"] == "SaveVideo":
            node["inputs"]["format"] = "mp4"
            node["inputs"].setdefault("codec", "h264")


JOBS = [
    ("A LTX T2V", "/tmp/ex/ltx_t2v.json", "ltx-2b-gguf-8gb.json",
     {"Note", "MarkdownNote"}, savevideo_fixup),
    ("C Wan InfiniteTalk", "/tmp/ex/wan_i2v_infinitetalk.json", "infinitetalk-q4-8gb.json",
     {"Note", "MarkdownNote", "SetNode", "GetNode", "VHS_VideoCombine"}, c_fixup),
    ("D LTX two-stage", "/tmp/ex/ltx_full.json", "ltx-2.3-two-stage-8gb.json",
     {"Note", "MarkdownNote"}, savevideo_fixup),
]

results = {}
for name, ex, out, drop, fx in JOBS:
    if not os.path.exists(ex):
        print(f"{name}: EXAMPLE MISSING {ex}")
        results[name] = "NO_EXAMPLE"
        continue
    prompt = W.convert(OBJ, ex, drop, fixups=fx)
    st, bad = W.validate(name, prompt)
    # write regardless (weight-gated errors are expected pre-download)
    json.dump(prompt, open(WFDIR + out, "w"), indent=1)
    results[name] = "CLEAN" if not bad else f"{len(bad)} non-weight errors"

print("\n=== SUMMARY (excluding weight-gated value_not_in_list) ===")
for k, v in results.items():
    print(f"  {k}: {v}")
