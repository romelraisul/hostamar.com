#!/usr/bin/env python3
"""Symlink duplicate model files after FULL-byte verification.

Rule (user's): only touch a pair when size matches AND full md5 matches, keep the
better-named copy as the real file. Never delete both. Idempotent: re-running
skips already-symlinked targets. Digests cached in dedup-digests.json so a
re-run doesn't re-hash 76 GB.
"""
import hashlib, json, os, sys, time

CACHE = "/home/romel/.hermes/cache/scratch/dedup-digests.json"
DRY = "--dry" in sys.argv

# (keep_this_real_file, replace_this_with_symlink)
PAIRS = [
    # X/X/ nested self-copies inside ComfyUI/models
    ("/home/romel/ComfyUI/models/diffusion_models/qwen_image_2.1_bf16.safetensors",
     "/home/romel/ComfyUI/models/diffusion_models/diffusion_models/qwen_image_2.1_bf16.safetensors"),
    ("/home/romel/ComfyUI/models/text_encoders/qwen3vl_8b_int8_convrot.safetensors",
     "/home/romel/ComfyUI/models/text_encoders/text_encoders/qwen3vl_8b_int8_convrot.safetensors"),
    ("/home/romel/ComfyUI/models/text_encoders/qwen3vl_8b_w4a8.safetensors",
     "/home/romel/ComfyUI/models/text_encoders/text_encoders/qwen3vl_8b_w4a8.safetensors"),
    ("/home/romel/ComfyUI/models/vae/qwen_image_2.1_vae_bf16.safetensors",
     "/home/romel/ComfyUI/models/vae/vae/qwen_image_2.1_vae_bf16.safetensors"),
    # HF-hash-named orphan == the properly named hunyuan 1.5 i2v file
    ("/home/romel/ComfyUI/models/diffusion_models/hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors",
     "/home/romel/ComfyUI/models/diffusion_models/aceeffabe7e1b5661b2f96b22f2eaf48420d6c43c2aa1cc55eecffd9c8485ec3"),
    # chatterbox kept live in ComfyUI; models-archive copies become symlinks
    ("/home/romel/ComfyUI/models/chatterbox/t3_cfg.safetensors",
     "/home/romel/models-archive/hub/models--ResembleAI--chatterbox/snapshots/5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18/t3_cfg.safetensors"),
    ("/home/romel/ComfyUI/models/chatterbox/s3gen.safetensors",
     "/home/romel/models-archive/hub/models--ResembleAI--chatterbox/snapshots/5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18/s3gen.safetensors"),
    # cosyvoice3-bengali shares cosyvoice2's CosyVoice-BlankEN
    ("/home/romel/ComfyUI/models/cosyvoice2/CosyVoice-BlankEN/model.safetensors",
     "/home/romel/ComfyUI/models/cosyvoice3-bengali/CosyVoice-BlankEN/model.safetensors"),
]

def md5_full(path, chunk=8 << 20):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        while True:
            b = fh.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def digest(path):
    st = os.stat(path)
    key = f"{path}|{st.st_size}|{int(st.st_mtime)}"
    if key in cache:
        return cache[key], True
    t = time.time()
    d = md5_full(path)
    cache[key] = d
    json.dump(cache, open(CACHE, "w"))
    print(f"    hashed {os.path.basename(path)[:46]} in {time.time()-t:.0f}s", flush=True)
    return d, False

saved = 0
for keep, dup in PAIRS:
    tag = f"{os.path.basename(dup)[:44]}"
    if not os.path.lexists(dup):
        print(f"SKIP  {tag}  (target missing, nothing to do)")
        continue
    if os.path.islink(dup):
        print(f"SKIP  {tag}  (already a symlink -> {os.readlink(dup)})")
        continue
    if os.path.getsize(keep) != os.path.getsize(dup):
        print(f"ABORT {tag}  size mismatch {os.path.getsize(keep)} != {os.path.getsize(dup)}")
        continue
    dk, ddup = digest(keep), digest(dup)
    if dk != ddup:
        print(f"ABORT {tag}  md5 differs — left untouched")
        continue
    n = os.path.getsize(dup)
    if DRY:
        print(f"WOULD {tag}  ({n/2**30:.1f}G) -> symlink to {keep}")
        saved += n
        continue
    os.remove(dup)
    os.symlink(keep, dup)
    # verify: symlink resolves, size matches, first 1 MiB reads identical to source
    ok = os.path.islink(dup) and os.path.getsize(dup) == n and \
        open(dup, "rb").read(1 << 20) == open(keep, "rb").read(1 << 20)
    assert ok, f"post-check failed for {dup}"
    saved += n
    print(f"OK    {tag}  ({n/2**30:.1f}G) symlinked -> prev real file freed")

print(f"\n{'WOULD SAVE' if DRY else 'SAVED'}: {saved/2**30:.1f} GB")
