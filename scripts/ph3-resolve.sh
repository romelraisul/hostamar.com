#!/usr/bin/env bash
# Resolve cherry-pick conflicts in /tmp/deploy-wt — v2 (regex-based).
set -euo pipefail
cd /tmp/deploy-wt

python3 - <<'PYEOF'
import re

src = open('middleware.ts', newline='').read()

# Conflict blocks look like:
# <<<<<<< HEAD\n<ours>\n=======\n<theirs>\n>>>>>>> <msg>\n
pat = re.compile(r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n", re.S)

def resolve(m):
    ours, theirs = m.group(1), m.group(2)
    if '/api/tv/' in theirs:
        # public API block: keep ours, add TV paths + sms webhook
        add = [l for l in theirs.splitlines(True)
               if any(k in l for k in ('/api/tv/', '/api/payments/sms-webhook'))]
        return ours + ''.join(add)
    if "'/tv'," in theirs:
        # publicPages block: keep ours, add /tv
        return ours + "    '/tv',\n"
    raise SystemExit(f'unrecognized conflict block: ours={ours[:60]!r} theirs={theirs[:60]!r}')

new, n = pat.subn(resolve, src)
assert n == 2, f'expected 2 conflicts, resolved {n}'
open('middleware.ts', 'w', newline='').write(new)
print(f'middleware.ts: {n} conflicts resolved')
PYEOF

git add middleware.ts

for f in lib/env.ts lib/ensure-schema.ts .env.example .gitignore; do
  git checkout --theirs "$f" && git add "$f" && echo "took theirs: $f"
done

# DU files: deleted on sso-providers side, TV commit modifies them → take TV versions
git add app/api/tv/playlist/route.ts app/api/tv/stream/start/route.ts app/tv/page.tsx \
        docker/tv-station/docker-compose.yml docker/tv-station/nginx.conf lib/tv/streamer.ts
echo "DU files staged"

LEFT=$(git status --short | grep -cE "^(UU|AA|DU|UD|AU|UA)" || true)
echo "unresolved remaining: $LEFT"
