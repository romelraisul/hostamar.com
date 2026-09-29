#!/usr/bin/env python3
"""
cosyvoice-vo.py — Bengali VO bridge for the Hostamar video worker.

Replaces edge-tts as the primary voiceover: synthesizes the VO text with the
Bengali CosyVoice3 fine-tune (kawshikbuet17/bengali-cosyvoice3-tts) running on
CPU, and writes BOTH the audio (wav) and a word-VTT-compatible cues file the
worker's caption pipeline already understands.

Why sentence-per-call: CosyVoice does not emit timings. Synthesizing each
sentence separately gives exact per-cue durations (len/sample_rate) so the VTT
times match the audio perfectly and the ORIGINAL text (not ASR output) is used.

Usage:
  python cosyvoice-vo.py --text "..." --out /path/vo.wav --vtt /path/vo.vtt

Env:
  COSY_MODEL_DIR   default /home/romel/ComfyUI/models/cosyvoice3-bengali
  COSY_PROMPT_WAV  default <CosyVoice repo>/asset/zero_shot_prompt.wav
  COSY_REPO        default /home/romel/CosyVoice
  COSY_FREE_COMFY  '0' to skip the ComfyUI /free call
"""
import argparse
import os
import re
import sys
import subprocess
import time

COSY_REPO = os.environ.get('COSY_REPO', '/home/romel/CosyVoice')
COSY_MODEL_DIR = os.environ.get('COSY_MODEL_DIR', '/home/romel/ComfyUI/models/cosyvoice3-bengali')
COSY_PROMPT_WAV = os.environ.get('COSY_PROMPT_WAV',
                                 '/home/romel/ComfyUI/models/cosyvoice3-bengali/prompt/female_bn_6s.wav')
SAMPLE_RATE = 24000  # CosyVoice2/3 output
MAX_CUES = 6         # worker caps captions at 6 too — keep parity

# CosyVoice3 system prefix (the demo space prepends this for cross-lingual)
SYS_PREFIX = 'You are a helpful assistant.<|endofprompt|>'


def split_cues(text, max_cues=MAX_CUES):
    """Split text into sentence-ish cues; merge overflow into the last cue."""
    text = re.sub(r'\s+', ' ', text or '').strip()
    if not text:
        return []
    parts = [p.strip() for p in re.split(r'(?<=[।!?.;])\s+', text) if p.strip()]
    if len(parts) <= max_cues:
        return parts
    head, tail = parts[:max_cues - 1], parts[max_cues - 1:]
    return head + [' '.join(tail)]


def free_comfy():
    """Ask ComfyUI to unload models before we allocate ~5GB of CosyVoice RAM.
    Runs in the post-process phase (render done) so it cannot disturb a render."""
    if os.environ.get('COSY_FREE_COMFY', '1') == '0':
        return
    try:
        subprocess.run(
            ['curl', '-s', '-m', '10', '-X', 'POST',
             'http://127.0.0.1:8188/free',
             '-H', 'Content-Type: application/json',
             '-d', '{"unload_models":true,"free_memory":true}'],
            check=False, capture_output=True)
    except Exception:
        pass


def fmt_ts(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--vtt', required=True)
    ap.add_argument('--speed', type=float, default=1.0)
    args = ap.parse_args()

    cues = split_cues(args.text)
    if not cues:
        print('[cosy] empty text', file=sys.stderr)
        sys.exit(2)

    free_comfy()

    sys.path.insert(0, COSY_REPO)
    sys.path.append(os.path.join(COSY_REPO, 'third_party/Matcha-TTS'))
    os.chdir(COSY_REPO)

    import torch
    import torchaudio
    import numpy as np
    torch.set_num_threads(int(os.environ.get('COSY_THREADS', '6')))

    from cosyvoice.cli.cosyvoice import AutoModel

    t0 = time.time()
    model = AutoModel(model_dir=COSY_MODEL_DIR)
    print(f'[cosy] model loaded in {time.time() - t0:.1f}s | sr={model.sample_rate}', flush=True)
    assert model.sample_rate == SAMPLE_RATE

    chunks = []
    vtt_lines = ['WEBVTT', '']
    cum = 0.0
    for i, cue in enumerate(cues):
        text = SYS_PREFIX + cue   # cross-lingual prefix, per demo space
        t0 = time.time()
        got = False
        for j in model.inference_cross_lingual(text, COSY_PROMPT_WAV, stream=False, speed=args.speed):
            audio = j['tts_speech'].detach().cpu()  # [1, n]
            dur = audio.shape[1] / SAMPLE_RATE
            chunks.append(audio)
            start, end = cum, cum + dur
            cum = end
            vtt_lines += [str(i + 1), f'{fmt_ts(start)} --> {fmt_ts(end)}', cue, '']
            got = True
        if not got:
            print(f'[cosy] cue {i + 1} produced no audio', file=sys.stderr)
            sys.exit(3)
        print(f'[cosy] cue {i + 1}/{len(cues)}: {len(cue)} chars → {cum:.2f}s cumulative ({time.time() - t0:.1f}s)', flush=True)

    full = torch.cat(chunks, dim=1) if len(chunks) > 1 else chunks[0]
    torchaudio.save(args.out, full, SAMPLE_RATE)
    with open(args.vtt, 'w', encoding='utf-8') as f:
        f.write('\n'.join(vtt_lines) + '\n')
    total = full.shape[1] / SAMPLE_RATE
    print(f'[cosy] wrote {args.out} ({total:.2f}s) + {args.vtt} ({len(cues)} cues)', flush=True)


if __name__ == '__main__':
    main()
