#!/usr/bin/env python3
"""fix-green-buttons.py — V16.4: white text on every solid-green surface.

Root cause of invisible button text: V16.3's text-white->ink pass had a BRAND
regex that missed emerald-* and gradient (from-[#0E7C3A]) surfaces, so white
text on green buttons became ink-on-green (~1.2:1). Also, any green button
whose string carried no explicit text class inherits ink from the paper parent.

Pass 1 (string-level, safe): inside a quoted className containing a SOLID
green bg (hex no-opacity, emerald/green-600/700, from-[#0E7C3A] gradient):
  - ink-family text tokens -> white (white/70 for the soft variants)
  - no text-* at all -> append text-white
Ternary else-branches pair ink text with light/hover bg in their OWN string,
so they are untouched by construction. Tinted greens (bg-*/10|/15|/20) are
light surfaces and excluded; progress bars/skeletons skipped.

Pass 2 (targeted): parent-context cases where the green bg lives on a PARENT
string (CreditMeter gradient card, product-card active branch, KPI icon chips,
cream-gradient accents made amber so white icons read).

Usage: python3 scripts/fix-green-buttons.py [--check]
"""
import re, sys, pathlib

DIRS = ['app/dashboard', 'app/admin']

GREEN = re.compile(
    r'bg-\[#(?:0E7C3A|146E2B|1A7A33)\](?!/)'          # solid brand hex, not /10 tints
    r'|bg-(?:emerald|green)-[67]00(?!/)'              # named scale
    r'|from-\[#0E7C3A\]'                              # gradient start
)
INK = re.compile(r'text-\[#1C1917\](?:/70)?|text-\[#57534E\]|text-\[#B8AFA3\]|text-\[#F6EBD2\]|text-\[#78716C\]')
HAS_TEXT = re.compile(r'\btext-(?!white)')
# bar/skeleton guards: elements with these are surfaces, not buttons
SKIP = re.compile(r'\bh-(?:1|1\.5|2)(?:\s|\]|")|animate-pulse|h-full|w-full h-full|/[0-9]+|via-transparent|to-emerald-50|style={{')

INK_TO_WHITE = [
    (re.compile(r'text-\[#1C1917\]/70'), 'text-white/70'),
    (re.compile(r'text-\[#1C1917\]'), 'text-white'),
    (re.compile(r'text-\[#57534E\]'), 'text-white/70'),
    (re.compile(r'text-\[#B8AFA3\]'), 'text-white/70'),
    (re.compile(r'text-\[#F6EBD2\]'), 'text-white'),
    (re.compile(r'text-\[#78716C\]'), 'text-white/70'),
]

# parent-context fixes: (file, old, new) — each unique in its file
TARGETED = [
    # CreditMeter green gradient card (page.tsx L52-75): ink children -> white
    ('app/dashboard/page.tsx',
     'text-[11px] tracking-[0.2em] text-[#1C1917]/70',
     'text-[11px] tracking-[0.2em] text-white/70'),
    ('app/dashboard/page.tsx',
     '<span className="text-[#1C1917]/70 text-sm">/ 6,000</span>',
     '<span className="text-white/70 text-sm">/ 6,000</span>'),
    ('app/dashboard/page.tsx',
     'text-[11px] text-[#1C1917]/70 justify-center',
     'text-[11px] text-white/70 justify-center'),
    # active product card (bg-[#0E7C3A] card on isActive): title/tagline/chip
    ('app/dashboard/page.tsx',
     "<div className={`text-xs ${isActive ? 'text-[#1C1917]/70' : 'text-[#57534E]'}`}>{p.taglineEn}</div>",
     "<div className={`text-xs ${isActive ? 'text-white/70' : 'text-[#57534E]'}`}>{p.taglineEn}</div>"),
    ('app/dashboard/page.tsx',
     "${isActive ? 'text-[#1C1917]' : 'text-[#1C1917]'}",
     "${isActive ? 'text-white' : 'text-[#1C1917]'}"),
    ('app/dashboard/page.tsx',
     "${isActive ? 'bg-white/20 text-[#1C1917]' : 'bg-[#F1F5F9] text-[#475569]'}",
     "${isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#475569]'}"),
    # KPI gradient icon chips: white icon on green; cream accent -> amber (white icon reads)
    ('app/admin/page.tsx',
     '<c.icon className="w-5 h-5 text-[#1C1917]"/>',
     '<c.icon className="w-5 h-5 text-white"/>'),
    ('app/admin/page.tsx',
     "accent: 'from-[#FDF8EC] to-[#F6EBD2]'",
     "accent: 'from-amber-600 to-amber-400'"),
    ('app/admin/components/ops/OpsKpiStrip.tsx',
     '<c.icon className="w-4 h-4 text-[#1C1917]"/>',
     '<c.icon className="w-4 h-4 text-white"/>'),
    ('app/admin/components/ops/OpsKpiStrip.tsx',
     "accent: 'from-[#FDF8EC] to-[#F6EBD2]'",
     "accent: 'from-amber-600 to-amber-400'"),
    ('app/admin/page.tsx',
     '<Cpu className="w-5 h-5 text-[#1C1917]"/>',
     '<Cpu className="w-5 h-5 text-white"/>'),
]


def convert_string(inner: str) -> str:
    if not GREEN.search(inner):
        return inner
    if SKIP.search(inner):
        return inner
    out = inner
    for pat, new in INK_TO_WHITE:          # order: /70 variant before bare token
        out = pat.sub(new, out)
    if not re.search(r'\btext-', out):
        out = out.rstrip() + ' text-white'
    return out


def files():
    out = set()
    for d in DIRS:
        p = pathlib.Path(d)
        if p.exists():
            out.update(sorted(set(list(p.rglob('*.tsx')) + list(p.rglob('*.ts')))))
    return out


def run(apply: bool) -> int:
    all_files = files()
    n_str, n_tgt = 0, 0
    for f in all_files:
        s = f.read_text(encoding='utf-8', errors='surrogatepass')
        orig = s
        s2 = re.sub(r'(["\'`])([^`"\']*)\1', lambda m: m.group(1) + convert_string(m.group(2)) + m.group(1), s)
        for fi, old, new in TARGETED:
            if fi == str(f) and old in s2:
                s2 = s2.replace(old, new, 1)
                n_tgt += 1
        if apply and s2 != s:
            f.write_text(s2, encoding='utf-8', errors='surrogatepass')
            n_str += 1
    mode = 'CHECK' if not apply else 'APPLY'
    print(f'[{mode}] pass1+2 files changed: {n_str if apply else "-"} | targeted hits: {n_tgt}')
    return n_tgt


def check() -> int:
    """Fail if any quoted string has solid green bg + ink text, or green bg with no text color
    while looking like a button (contains rounded-*/btn-ish and not a bar/skeleton)."""
    bad = []
    for f in files():
        lines = f.read_text(encoding='utf-8', errors='surrogatepass').split('\n')
        for i, line in enumerate(lines, 1):
            for q in re.findall(r'(["\'`])([^`"\']*)\1', line):
                inner = q[1]
                if GREEN.search(inner) and not SKIP.search(inner):
                    if INK.search(inner):
                        bad.append(f'{f}:{i} ink-on-green: {inner[:90]}')
                    elif not re.search(r'text-white|text-\[#|text-\[', inner):
                        child_white = 'text-white' in line.replace(inner, '')
                        is_bar = 'style={{' in line or 'h-' in inner
                        if not child_white and not is_bar:
                            bad.append(f'{f}:{i} green-no-text: {inner[:90]}')
    if bad:
        print(f'FAIL: {len(bad)} green-on-green / missing-white:')
        for b in bad[:30]:
            print(' -', b)
        return 1
    print('OK: all solid-green surfaces carry white text')
    return 0


if __name__ == '__main__':
    if '--check' in sys.argv:
        sys.exit(check())
    run(apply=True)
    sys.exit(check())
