#!/usr/bin/env python3
"""Realign the marketing assets' BDT prices with the live plan set.

Stale (Sep-29 asset library)  ->  live (verified 2026-10-10 on /pricing JSON-LD)
  Starter   ৳2000  ->  ৳990        6000 cr/mo
  Pro       ৳3500  ->  ৳1900      13000 cr/mo
  Business  ৳6000  ->  ৳2900      30000 cr/mo
(free tier is "৳0 to start" - the old "50% OFF beta, first 100" promo is gone)

Byte-level edit so \r\n and encoding are preserved exactly; every changed file is
copied to marketing-output/.price-backup-<ts>/ first.

  python3 scripts/fix-marketing-pricing.py            # dry run, prints the plan
  python3 scripts/fix-marketing-pricing.py --apply    # changes files + verifies
"""
import pathlib, re, shutil, sys, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIRS = [ROOT / 'marketing-output', ROOT / 'docs' / 'marketing']
ROOTS = [ROOT / n for n in ('FACEBOOK_POSTS.md', 'FACEBOOK-LAUNCH-PACK.md', 'FACEBOOK_GROUPS.txt',
                            'FACEBOOK_SCHEDULE.txt', 'LAUNCH.md', 'DAY-1-LAUNCH.md',
                            'FINAL-LAUNCH-CHECKLIST.md', 'MARKETING_LAUNCH_CHECKLIST.md',
                            'SEO-AUDIT-REPORT.md')]
SUFFIX = {'.txt', '.md', '.json', '.html', '.yaml', '.yml'}

PAIRS = [  # order matters: longest / Bengali-comma forms first
    ('৳২,০০০', '৳৯৯০'), ('৳২,000', '৳৯৯০'), ('৳২ ০০০', '৳৯৯০'), ('৳2000', '৳990'),
    ('৳২,০০০.০০', '৳৯৯০'), ('৳2,000', '৳990'), ('৳২০০০', '৳৯৯০'),
    ('৳৩,৫০০', '৳১,৯০০'), ('৳৩,500', '৳১,৯০০'), ('৳3500', '৳1900'), ('৳3,500', '৳1900'),
    ('৳৩৫০০', '৳১,৯০০'),
    ('৳৬,০০০', '৳২,৯০০'), ('৳৬,000', '৳২,৯০০'), ('৳6000', '৳2900'), ('৳6,000', '৳2900'),
    ('৳৬০০০', '৳২,৯০০'),
]
# "2,000 টাকা" / "3500 Taka"-style prices (no ৳ sign). Currency word required, so
# legitimate credit counts ("৬,০০০ ক্রেডিট") are never touched.
TAKA_MAP = {'২,০০০': '৯৯০', '২,000': '৯৯০', '২০০০': '৯৯০', '2000': '990', '2,000': '990',
            '৩,৫০০': '১,৯০০', '৩,500': '১,৯০০', '৩৫০০': '১,৯০০', '3500': '1900', '3,500': '1900',
            '৬,০০০': '২,৯০০', '৬,000': '২,৯০০', '৬০০০': '২,৯০০', '6000': '2900', '6,000': '2900'}
TAKA_RE = re.compile(r'(' + '|'.join(map(re.escape, TAKA_MAP)) +
                     r')(\s*)(টাকা|Taka|taka|TK|Tk|BDT)')
STALE_MARK = ['৳২,০০০', '৳২,000', '৳2000', '৳2,000', '৳২০০০',
              '৳৩,৫০০', '৳৩,500', '৳3500', '৳3,500', '৳৩৫০০',
              '৳৬,০০০', '৳৬,000', '৳6000', '৳6,000', '৳৬০০০']
# semantic mismatches a price swap cannot fix - need a copy decision by the owner
FLAGS = [('50% OFF', 'beta promo that no longer exists'), ('৫০% OFF', 'beta promo that no longer exists'),
         ('videos/month', 'old video-quota plans -> live plans are credit-based'),
         ('ভিডিও/মাস', 'old video-quota plans -> live plans are credit-based'),
         ('Enterprise', 'plan renamed: live set is Starter/Pro/Business')]


def targets():
    seen = []
    for d in DIRS:
        if d.is_dir():
            seen += [p for p in sorted(d.rglob('*')) if p.is_file() and p.suffix in SUFFIX
                     and '.price-backup' not in str(p)]
    seen += [p for p in ROOTS if p.is_file()]
    return seen


def main():
    apply = '--apply' in sys.argv
    stamp = time.strftime('%Y%m%d-%H%M%S')
    # outside the repo on purpose: backups must never ship in a commit
    backup = pathlib.Path.home() / 'backups' / 'marketing-price' / stamp
    changed = []
    for p in targets():
        raw = p.read_bytes()
        new = raw
        hits = 0
        for old, rep in PAIRS:
            n = new.count(old.encode())
            if n:
                new = new.replace(old.encode(), rep.encode())
                hits += n
        txt = new.decode('utf-8', 'surrogateescape')
        txt, n = TAKA_RE.subn(lambda m: TAKA_MAP[m.group(1)] + m.group(2) + m.group(3), txt)
        hits += n
        new = txt.encode('utf-8', 'surrogateescape')
        if new == raw:
            continue
        changed.append((p, hits))
        if apply:
            rel = p.relative_to(ROOT)
            dst = backup / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(raw)
            p.write_bytes(new)
    mode = 'APPLIED' if apply else 'DRY RUN'
    print(f'{mode}: {len(changed)} files would change / changed; '
          f'{sum(h for _, h in changed)} price tokens')
    for p, h in changed:
        print(f'  {h:>2}  {p.relative_to(ROOT)}')
    if apply and changed:
        print(f'backups: {backup.relative_to(ROOT)}/')

    # verify
    left = []
    for p in targets():
        t = p.read_text(encoding='utf-8', errors='replace')
        if any(m in t for m in STALE_MARK) or TAKA_RE.search(t):
            left.append(p.relative_to(ROOT))
    print(f'\nVERIFY stale prices left: {len(left)} file(s)')
    for p in left:
        print(f'  ! {p}')
    if apply:
        assert not left, 'stale prices remain - fix before pushing'
        print('VERIFY CSV: PASS - no stale ৳ token anywhere in the asset set')

    print('\nSTRUCTURAL (price swap cannot fix these - owner decides the copy):')
    for p in targets():
        t = p.read_text(encoding='utf-8', errors='replace')
        found = [w for w, why in FLAGS if w in t]
        if found:
            print(f'  {p.relative_to(ROOT)}: {", ".join(found)}')


if __name__ == '__main__':
    main()
