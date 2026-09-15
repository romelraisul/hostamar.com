#!/usr/bin/env python3
"""paper-theme-convert.py — flip dark-theme Tailwind utilities to the homepage
paper palette (post-login areas only: app/admin, app/dashboard, components/ops).

Why a per-utility table and not a tailwind scale override: the dark theme pairs
light TEXT with dark BG *within the same scale* (text-zinc-300 on bg-zinc-800),
so remapping the scale would collide text and bg onto identical keys. Mapping
each utility to an explicit palette value is deterministic and safe.

Palette (source: app/globals.css): paper #FBF4E4 / paper-2 #FDF8EC / card #FFFDF6
/ ink #1C1917 / ink-soft #57534E / green #0E7C3A.
"""
import re, sys, pathlib

# order matters: longer/step-specific first
BG = {
    'zinc-950': '#FBF4E4', 'zinc-900': '#F6EBD2', 'zinc-800': '#FFFDF6', 'zinc-700': '#FDF8EC',
    'zinc-600': '#F6EBD2', 'zinc-500': '#EADFC4', 'zinc-400': '#E7DCC0', 'zinc-300': '#F0E7CF',
    'zinc-200': '#FBF4E4', 'zinc-100': '#FBF4E4',
    'slate-950': '#FBF4E4', 'slate-900': '#F6EBD2', 'slate-800': '#FFFDF6', 'slate-700': '#FDF8EC',
    'slate-600': '#F6EBD2', 'slate-500': '#EADFC4', 'slate-400': '#E7DCC0', 'slate-300': '#F0E7CF',
    'slate-200': '#FBF4E4', 'slate-100': '#FBF4E4',
    '#1C1917': '#FFFDF6',   # ink bg -> card
    '#23201D': '#FDF8EC',   # ink-2 bg -> paper-2
    '#0F172A': '#FBF4E4',
    '#111827': '#FBF4E4',
    '#0d1117': '#FBF4E4',
    '#161b22': '#FFFDF6',
    '#1e1e1e': '#FFFDF6',
    '#0a0a0a': '#FBF4E4',
    '#111': '#FBF4E4',
}
TEXT = {
    'zinc-950': '#1C1917', 'zinc-900': '#1C1917', 'zinc-800': '#292524', 'zinc-700': '#44403C',
    'zinc-600': '#57534E', 'zinc-500': '#57534E', 'zinc-400': '#78716C', 'zinc-300': '#57534E',
    'zinc-200': '#1C1917', 'zinc-100': '#1C1917',
    'slate-950': '#1C1917', 'slate-900': '#1C1917', 'slate-800': '#292524', 'slate-700': '#44403C',
    'slate-600': '#57534E', 'slate-500': '#57534E', 'slate-400': '#78716C', 'slate-300': '#57534E',
    'slate-200': '#1C1917', 'slate-100': '#1C1917',
    '#F8FAFC': '#1C1917', '#F1F5F9': '#1C1917', '#E2E8F0': '#292524',
    '#94A3B8': '#78716C', '#CBD5E1': '#57534E', '#64748B': '#57534E',
    '#9CA3AF': '#78716C', '#D1D5DB': '#57534E', '#6B7280': '#57534E', '#4B5563': '#44403C',
    '#0F172A': '#1C1917',
}
BORDER = {
    'zinc-950': '#1C1917', 'zinc-900': '#D8CDB4', 'zinc-800': '#D8CDB4', 'zinc-700': '#D8CDB4',
    'zinc-600': '#CBBFA4', 'zinc-500': '#CBBFA4', 'zinc-400': '#CBBFA4', 'zinc-300': '#D8CDB4',
    'zinc-200': '#E6DCC4', 'zinc-100': '#E6DCC4',
    'slate-900': '#D8CDB4', 'slate-800': '#D8CDB4', 'slate-700': '#D8CDB4', 'slate-600': '#CBBFA4',
    'slate-500': '#CBBFA4', 'slate-400': '#CBBFA4', 'slate-300': '#D8CDB4', 'slate-200': '#E6DCC4',
    'slate-100': '#E6DCC4',
    '#1C1917': '#D8CDB4', '#23201D': '#D8CDB4',
    '#E2E8F0': '#E6DCC4', '#334155': '#CBBFA4', '#475569': '#CBBFA4',
}
# ring/divide/from/to/placeholder reuse the border/text/bg maps
RING = BORDER
FROM = BG
TO = BG
PLACEHOLDER = {'zinc-600': '#A89E8C', 'zinc-500': '#A89E8C', 'zinc-400': '#A89E8C',
               'slate-600': '#A89E8C', 'slate-500': '#A89E8C', 'slate-400': '#A89E8C'}

KEY = r'([a-zA-Z0-9#\-]+)'  # token value incl. hyphens (zinc-800) and arbitrary-hex-less forms


def repl_util(m: 're.Match', table: dict) -> str:
    prefix, val = m.group(1), m.group(2)
    return f'{prefix}-[{table[val]}]' if val in table else m.group(0)


PATTERNS = [
    (re.compile(r'\b(bg)-(' + KEY + r')(?=[\s"\']|$)'), BG),
    (re.compile(r'\b(text)-(' + KEY + r')(?=[\s"\']|$)'), TEXT),
    (re.compile(r'\b(border)-(' + KEY + r')(?=[\s"\']|$)'), BORDER),
    (re.compile(r'\b(ring)-(' + KEY + r')(?=[\s"\']|$)'), RING),
    (re.compile(r'\b(divide)-(' + KEY + r')(?=[\s"\']|$)'), RING),
    (re.compile(r'\b(from)-(' + KEY + r')(?=[\s"\']|$)'), FROM),
    (re.compile(r'\b(to)-(' + KEY + r')(?=[\s"\']|$)'), TO),
    (re.compile(r'\b(placeholder)-(' + KEY + r')(?=[\s"\']|$)'), PLACEHOLDER),
    # arbitrary values like bg-[#1C1917]
    (re.compile(r'(\bbg)-\[(#[0-9a-fA-F]{3,6})\]'), BG),
    (re.compile(r'(\btext)-\[(#[0-9a-fA-F]{3,6})\]'), TEXT),
    (re.compile(r'(\bborder)-\[(#[0-9a-fA-F]{3,6})\]'), BORDER),
]

# Utilities whose bg must stay dark: a white/paper text sits on a NON-converted
# surface (brand green, blue, amber buttons) -> not applicable. Simpler rule that
# matches the dark->light intent: inside one className string, a converted dark
# bg means its text-white was WHITE-ON-DARK and must become ink; if the string's
# bg is brand green/blue (kept), text-white stays white.
BRAND_BG = re.compile(r'bg-(\[#0E7C3A\]|\[#10B981\]|\[#2563EB\]|brand-\d+00|primary|green-\d+00|blue-\d+00|red-\d+00|amber-\d+00|\[#F59E0B\])')


def convert_file(path: pathlib.Path) -> int:
    src = path.read_text(encoding='utf-8', errors='surrogatepass')
    orig = src

    def convert_class(m):
        quote, inner = m.group(1), m.group(2)
        # Is there a dark bg token in this string that we will convert?
        dark_bg = re.search(r'bg-(zinc-(7|8|9|950)0|slate-(7|8|9|950)0)(?![0-9])', inner) or \
                  re.search(r'bg-\[#(1C1917|23201D|0F172A|111827|0d1117|161b22|1e1e1e|0a0a0a|111)\]', inner)
        out = inner
        for pat, table in PATTERNS:
            out = pat.sub(lambda mm, t=table: repl_util(mm, t), out)
        # white text that sat on a converted dark bg -> ink (unless a brand bg is present)
        if dark_bg and not BRAND_BG.search(inner):
            out = re.sub(r'\btext-white\b', 'text-[#1C1917]', out)
            out = re.sub(r'\btext-\[#FFFDF6\]', 'text-[#1C1917]', out)
        return f'{quote}{out}{quote}'

    src = re.sub(r'(["\'])([^"\']*)\1', convert_class, src)
    if src != orig:
        path.write_text(src, encoding='utf-8', errors='surrogatepass')
        return 1
    return 0


if __name__ == '__main__':
    targets = [pathlib.Path(p) for p in sys.argv[1:]]
    files = []
    for t in targets:
        files += list(t.rglob('*.tsx')) + list(t.rglob('*.ts')) if t.is_dir() else [t]
    n = sum(convert_file(f) for f in sorted(set(files)))
    print(f'converted {n} files of {len(set(files))} scanned')
