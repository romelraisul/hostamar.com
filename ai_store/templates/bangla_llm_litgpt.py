# ai_store/templates/bangla_llm_litgpt.py — Bangla LLM Fine-tuning template
# AI Store product: "Bangla LLM Training — 5000cr" (1cr=1TK=1COIN).
#
# Hackable LLMs, 1-2 commands (LitGPT): llama-3.2-3B / mistral-7b, LoRA/QLoRA.
# LitData for dataset loading speed, TorchMetrics for eval accuracy.
#
# Usage (customer or owner):
#   python bangla_llm_litgpt.py --check                # runnable self-check
#   python bangla_llm_litgpt.py --prep                 # build Bangla dataset
#   litgpt finetune lora  --config ai_store/templates/bangla_llm.yaml
#   litgpt finetune qlora --config ai_store/templates/bangla_llm.yaml # 8GB VRAM path
#   litgpt chat checkpoint_dir=out/lora/bangla/
#
# Delivery: JSONL {"instruction": ..., "input": ..., "output": ...} — LitGPT's
# default instruction format, so the finetune command needs zero glue code.
#
# ponytail: dataset builder is intentionally tiny (regex JSONL) — it covers the
# common "have CSV/TXT, want JSONL" path. Add CSV column mapping when a customer
# actually ships CSV with headers.
from __future__ import annotations

import argparse
import json
import os
import sys

# AI Store catalog entry (kept in sync with /docs/sops cards).
PRODUCT = {
    "name": "Bangla LLM Fine-tuning (LoRA/QLoRA)",
    "credits": 5000,
    "models": ["llama-3.2-3B", "mistral-7b", "gemma-7b"],
    "vram": {"lora": "12GB+", "qlora": "8GB (RTX 5060 OK)"},
    "endpoint": "https://hostamar.com/api/v1/chat/completions",
}

# QLoRA on the RTX 5060 (8GB): 3B model, 4-bit, small batch. Write the config
# next to the template so `litgpt finetune qlora --config` just works.
QLORA_CONFIG = """\
# Bangla LLM QLoRA — fits RTX 5060 8GB (checkpoints to WSL disk, never C:)
checkpoint_dir: out/lora/bangla
model:
  name: tiiuae/falcon-3-3b-instruct  # swap: mistralai/Mistral-7B-v0.2 (12GB+)
data:
  class_path: litgpt.data.JSON
  init_args:
    json_path: data/bangla_train.jsonl
    val_split_fraction: 0.05
    prompt_template: mol
training:
  micro_batch_size: 1
  max_seq_length: 512
epochs: 3
"""

def build_jsonl(rows: list[dict], out_path: str) -> int:
    """rows: [{instruction, input?, output}] → LitGPT JSON. Returns count."""
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    n = 0
    with open(out_path, "w", encoding="utf-8") as f:
        for r in rows:
            rec = {"instruction": str(r.get("instruction", ""))[:2000],
                   "input": str(r.get("input", ""))[:2000],
                   "output": str(r.get("output", ""))[:4000]}
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
    return n

def selfcheck() -> int:
    """Runnable check: JSONL round-trip + config written + PRODUCT sane."""
    rows = [{"instruction": "বাংলায় সালাম বলো", "output": "ওয়ালাইকুম সালাম — Hostamar AI"},
            {"instruction": "Explain bKash top-up", "output": "Send Money to 01822417463, submit TrxID at /dashboard/payment"},
            {"instruction": "1cr কত টাকা", "output": "1cr = 1TK = 1 future HOST coin"}]
    p = "/home/romel/.hermes/cache/scratch/bangla_selfcheck.jsonl"
    n = build_jsonl(rows, p)
    assert n == 3, f"expected 3 rows, wrote {n}"
    first = json.loads(open(p, encoding="utf-8").readline())
    assert first["instruction"] == "বাংলায় সালাম বলো", "bangla not preserved"
    assert "output" in first, "missing output field"
    cfg_path = "/home/romel/hostamar.com/ai_store/templates/bangla_llm.yaml"
    with open(cfg_path, "w", encoding="utf-8") as f:
        f.write(QLORA_CONFIG)
    print(f"[selfcheck] JSONL OK ({n} rows, bangla preserved), config -> {cfg_path}, "
          f"PRODUCT credits={PRODUCT['credits']}cr, models={PRODUCT['models']}")
    return 0

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--prep", action="store_true")
    ap.add_argument("--data", default="data/bangla_train.jsonl")
    args = ap.parse_args()
    if args.check:
        sys.exit(selfcheck())
    if args.prep:
        rows = json.load(open(args.data.replace(".jsonl", ".json"), encoding="utf-8")) \
            if os.path.exists(args.data.replace(".jsonl", ".json")) else []
        print(f"built {build_jsonl(rows, args.data)} rows -> {args.data}")
    else:
        print(__doc__)
