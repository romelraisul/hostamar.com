"""Thunder benchmark — toy model, NOT the live ComfyUI VRAM.

The live ComfyUI holds ~6.4GB of the RTX 5060's 8GB; loading a second model
would OOM the production service. This benchmark uses a small toy transformer
block so Thunder's speedup is measurable in <2GB VRAM.

    python thunder_bench.py            # eager vs thunder.compile timing
    python thunder_bench.py --check    # assertion-based self-check
"""
import argparse
import time

import torch
import torch.nn as nn

# ponytail: toy width 256 — big enough for a real GEMM pattern, small enough
# for <2GB VRAM alongside the live ComfyUI. Raise to 1024 when the box is free.
D = 256


class Block(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.ln = nn.LayerNorm(D)
        self.fc1 = nn.Linear(D, D * 4)
        self.fc2 = nn.Linear(D * 4, D)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.fc2(self.act(self.fc1(self.ln(x))))


def bench(fn, iters: int = 30) -> float:
    """Median ms/iter after 5 warmup calls."""
    for _ in range(5):
        fn()
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    times = []
    for _ in range(iters):
        t0 = time.perf_counter()
        fn()
        if torch.cuda.is_available():
            torch.cuda.synchronize()
        times.append((time.perf_counter() - t0) * 1000)
    times.sort()
    return times[len(times) // 2]


def main() -> int:
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    m = Block().to(dev).eval()
    x = torch.randn(8, 128, D, device=dev)

    eager_ms = bench(lambda: m(x))

    model_t = m
    try:
        import thunder  # noqa: F401
        model_t = thunder.compile(m)
        thunder_ms = bench(lambda: model_t(x))
    except ImportError:
        print("[bench] thunder not installed — eager baseline only")
        print(f"[bench] eager {eager_ms:.2f} ms/iter on {dev}")
        return 0

    gain = (eager_ms - thunder_ms) / eager_ms * 100
    vram = torch.cuda.memory_allocated() / 1e6 if torch.cuda.is_available() else 0
    print(f"[bench] eager   {eager_ms:.2f} ms/iter")
    print(f"[bench] thunder {thunder_ms:.2f} ms/iter  ({gain:+.1f}%)  vram {vram:.0f}MB on {dev}")
    return 0


def check() -> int:
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    m = Block().to(dev).eval()
    x = torch.randn(2, 32, D, device=dev)
    with torch.no_grad():
        ref = m(x)
    try:
        import thunder
        t = thunder.compile(m)
    except ImportError:
        print("[check] thunder not installed — eager-only check (output shape/finite)")
        with torch.no_grad():
            out = m(x)
        assert out.shape == ref.shape, "shape drift"
        assert torch.isfinite(out).all(), "non-finite output"
        print(f"[check] OK eager output {tuple(out.shape)} finite on {dev}")
        return 0
    with torch.no_grad():
        out = t(x)
    assert out.shape == ref.shape, f"shape drift {out.shape} vs {ref.shape}"
    assert torch.isfinite(out).all(), "non-finite output under thunder"
    assert torch.allclose(out, ref, atol=1e-4), "thunder output diverges from eager"
    print(f"[check] OK thunder output matches eager (atol=1e-4) on {dev}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    raise SystemExit(check() if a.check else main())
