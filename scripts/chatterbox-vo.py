#!/usr/bin/env python3
"""chatterbox-vo.py — Chatterbox 13G VO for Hostamar worker.

Usage: chatterbox-vo.py --text "..." --out /path/out.wav [--vtt /path/out.vtt]

Outputs 24kHz mono WAV. VTT is a synthetic full-length cue (Chatterbox has no
word-timing API; we approximate by even split per sentence, then scale so the
last cue ends at the actual audio duration — ffprobe probed after save).

Falls through to exit 1 on any failure so the worker falls back to CosyVoice3
then edge-tts without stranding the render.
"""
import argparse
import sys
import re
import subprocess
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--vtt', default='')
    ap.add_argument('--exaggeration', type=float, default=0.7)
    ap.add_argument('--cfg-weight', type=float, default=0.5)
    ap.add_argument('--device', default='cuda')
    args = ap.parse_args()

    text = args.text.strip()
    if not text:
        print('[chatterbox-vo] empty text', file=sys.stderr)
        return 1

    try:
        from chatterbox.tts import ChatterboxTTS
        import torchaudio
        import torch
    except ImportError as e:
        print(f'[chatterbox-vo] import failed: {e}', file=sys.stderr)
        return 1

    try:
        model = ChatterboxTTS.from_pretrained(device=args.device)
        wav = model.generate(text, exaggeration=args.exaggeration, cfg_weight=args.cfg_weight)
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        torchaudio.save(str(out), wav, model.sr)
        duration = float(wav.shape[-1]) / float(model.sr)
        print(f'[chatterbox-vo] OK {out} {duration:.2f}s @ {model.sr}Hz')
    except Exception as e:
        print(f'[chatterbox-vo] generate failed: {e}', file=sys.stderr)
        return 1

    if args.vtt:
        # Sentence-split VTT (sentence boundaries: ।, !, ?, ., \n — keep
        # Bangla danda as terminator). Scale so last cue ends at duration.
        sents = [s.strip() for s in re.split(r'(?<=[।!?\.।\n])\s+', text) if s.strip()]
        if not sents:
            sents = [text]
        per = duration / max(len(sents), 1)
        cues = []
        for i, s in enumerate(sents):
            t0 = i * per
            t1 = min((i + 1) * per, duration)

            def t(sec: float) -> str:
                sec = max(sec, 0.0)
                h = int(sec // 3600)
                m = int((sec % 3600) // 60)
                s2 = sec % 60
                return f'{h:02d}:{m:02d}:{s2:06.3f}'

            cues.append(f'{i+1}\n{t(t0)} --> {t(t1)}\n{s}\n')
        Path(args.vtt).write_text('WEBVTT\n\n' + '\n'.join(cues), encoding='utf-8')

    # Free CUDA before the worker's next model load
    try:
        del model
        torch.cuda.empty_cache()
    except Exception:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
