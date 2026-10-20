#!/usr/bin/env python3
"""Regenerate self-hosted subset fonts for hostamar.com.

Corpus = every character that appears in repo source that can render on a page
(app/, components/, lib/, content/, scripts/tv metadata) + optional extra
corpus files passed as argv (e.g. live-page text dumps for DB-driven names).
Safety chars (ASCII, Bengali digits, ৳, ZWJ/ZWNJ, punctuation) always kept so
shaping (conjuncts via ZWJ) and Latin never tofu.

Usage:
  /usr/bin/python3 scripts/fonts/make-subsets.py [extra_corpus.txt ...]

Sources are fetched once from google/fonts into /tmp/fonts (see URLs below).
"""
import subprocess, sys, os, re, json, glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'public', 'fonts')
FDIR = '/tmp/fonts'
SRC = {
    'HindSiliguri-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/hindsiliguri/HindSiliguri-Regular.ttf',
    'HindSiliguri-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/hindsiliguri/HindSiliguri-Bold.ttf',
    'Archivo-var.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf',
}
SCAN_DIRS = ['app', 'components', 'lib', 'content', 'scripts/tv', 'docs']
EXTS = ('.tsx', '.ts', '.js', '.mjs', '.json', '.mdx', '.md', '.txt', '.html')

# Always-keep safety set: ASCII printable, NBSP, Bengali digits, taka, danda,
# ZWJ/ZWNJ (conjunct shaping!), dashes/quotes/ellipsis/middot/bullet/arrow/mult.
SAFETY = (
    ''.join(chr(c) for c in range(0x20, 0x7F))
    + '\u00A0\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF'
    + '\u09F3\u0964\u200C\u200D\u2013\u2014\u2018\u2019\u201C\u201D\u2026'
    + '\u00B7\u2022\u2192\u00D7\u0981\u0982\u0983\u09BC\u0985'
)

def corpus_chars():
    chars = set(SAFETY)
    for d in SCAN_DIRS:
        base = os.path.join(REPO, d)
        if not os.path.isdir(base):
            continue
        for p in glob.glob(base + '/**/*', recursive=True):
            if not p.endswith(EXTS) or not os.path.isfile(p):
                continue
            try:
                txt = open(p, encoding='utf8', errors='ignore').read()
                if p.endswith('.json'):
                    try:
                        txt += json.dumps(json.loads(txt), ensure_ascii=False)
                    except Exception:
                        txt += re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), txt)
                chars.update(txt)
            except OSError:
                pass
    for extra in sys.argv[1:]:
        try:
            chars.update(open(extra, encoding='utf8', errors='ignore').read())
        except OSError:
            print(f'warn: extra corpus {extra} unreadable')
    chars = {c for c in chars if c.isprintable() or c in '\u200c\u200d\u00a0'}
    return chars

def fetch(srcs):
    os.makedirs(FDIR, exist_ok=True)
    for name, url in srcs.items():
        p = os.path.join(FDIR, name)
        if os.path.exists(p) and os.path.getsize(p) > 50000:
            continue
        subprocess.run(['curl', '-sL', '-o', p, url], check=True)

def subset(src, out, textfile, pin=None):
    work = src
    if pin:
        # pin listed axes (e.g. wdth=100), keep others variable
        work = src.replace('.ttf', '-inst.ttf')
        axes = ' '.join(f'{k}={v}' for k, v in pin.items())
        subprocess.run(['/usr/bin/python3', '-m', 'fontTools.varLib.instancer', src, '-o', work] + axes.split(), check=True)
    r = subprocess.run([
        '/usr/bin/python3', '-m', 'fontTools.subset', work,
        f'--text-file={textfile}', '--flavor=woff2', '--no-hinting',
        '--layout-features=*', '--ignore-missing-glyphs',
        '--name-IDs=1,2', f'--output-file={out}',
    ], capture_output=True, text=True)
    print(r.stdout, r.stderr)
    return out

def main():
    chars = corpus_chars()
    corpus = os.path.join(FDIR, 'corpus.txt')
    with open(corpus, 'w', encoding='utf8') as f:
        f.write(''.join(sorted(chars)))
    print(f'corpus: {len(chars)} distinct chars')
    fetch(SRC)
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ('HindSiliguri-Regular.ttf', 'hind-siliguri-400-subset.woff2', None),
        ('HindSiliguri-Bold.ttf', 'hind-siliguri-700-subset.woff2', None),
        ('Archivo-var.ttf', 'archivo-var-subset.woff2', {'wdth': 100}),
    ]
    for src, out, pin in jobs:
        p = subset(os.path.join(FDIR, src), os.path.join(OUT, out), corpus, pin)
        print(f'{out}: {os.path.getsize(p)} bytes')
    # self-check: every corpus char must have a cmap entry in the subset
    from fontTools.ttLib import TTFont
    for _, out, _ in jobs:
        f = TTFont(os.path.join(OUT, out))
        cmap = f.getBestCmap() or {}
        missing = [c for c in chars if ord(c) > 0x7F and ord(c) not in cmap]
        print(f'{out}: covers {len(chars) - len(missing)}/{len(chars)} corpus chars'
              + (f' MISSING(->system fallback): {"".join(sorted(missing))}' if missing else ''))

if __name__ == '__main__':
    main()
