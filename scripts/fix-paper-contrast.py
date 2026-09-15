#!/usr/bin/env python3
"""fix-paper-contrast.py — V16.3 second pass after paper-theme-convert.py.

paper-theme-convert.py flipped dark utilities to the paper palette, but two
cream/greige text hexes were never in its TEXT map and stayed invisible on the
new light surfaces. Measured contrast vs card #FFFDF6:
    text-[#F6EBD2]  1.16:1  (invisible — cream on cream)
    text-[#B8AFA3]  2.13:1  (fails 4.5:1 — greige on cream)
Targets: primary -> ink #1C1917 (17.2:1), secondary/meta -> ink-soft #57534E
(7.5:1). Brand surfaces (bg green/blue/amber/gradient) keep text-white — that
rule is enforced by paper-theme-convert.py and must not be undone here.

Usage:
  python3 scripts/fix-paper-contrast.py            # apply
  python3 scripts/fix-paper-contrast.py --check    # verify only (assert 0)
"""
import re, sys, pathlib

MAP = {
    'text-[#F6EBD2]': 'text-[#1C1917]',            # cream text -> ink
    'hover:text-[#F6EBD2]': 'hover:text-[#1C1917]',
    'text-[#B8AFA3]': 'text-[#57534E]',            # greige meta -> ink-soft
    'hover:text-[#B8AFA3]': 'hover:text-[#57534E]',
    'placeholder:text-[#B8AFA3]': 'placeholder:text-[#78716C]',
}
DIRS = ['app/dashboard', 'app/admin']
# any of these as TEXT on a light surface is invisible/failing contrast
BAD = re.compile(r'text-\[#(?:F6EBD2|B8AFA3|E7DDC7|D8CDB4|FBF4E4|FFFDF6|FDF8EC)\](?:/[0-9]+)?')

# brand surfaces legitimately carrying white text
BRAND = re.compile(r'bg-\[#(?:0E7C3A|10B981|2563EB|F59E0B|B45309|DC2626)\]|bg-(?:green|blue|red|amber|emerald|brand)-\d00|bg-gradient')


def files():
    for d in DIRS:
        p = pathlib.Path(d)
        if p.exists():
            yield from sorted(set(list(p.rglob('*.tsx')) + list(p.rglob('*.ts'))))


def check() -> int:
    bad = []
    for f in files():
        for i, line in enumerate(f.read_text(encoding='utf-8', errors='surrogatepass').split('\n'), 1):
            if BAD.search(line) and not BRAND.search(line):
                bad.append(f'{f}:{i}')
    if bad:
        print(f'FAIL: {len(bad)} invisible text token(s):')
        for b in bad[:40]:
            print(' -', b)
        return 1
    print(f'OK: 0 invisible text tokens across {len(list(files()))} files')
    return 0


if __name__ == '__main__':
    if '--check' in sys.argv:
        sys.exit(check())
    n = 0
    for f in files():
        s = f.read_text(encoding='utf-8', errors='surrogatepass')
        o = s
        for a, b in MAP.items():
            s = s.replace(a, b)
        if s != o:
            f.write_text(s, encoding='utf-8', errors='surrogatepass')
            n += 1
    print(f'fixed {n} files')
    sys.exit(check())
