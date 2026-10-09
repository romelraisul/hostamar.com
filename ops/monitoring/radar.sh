#!/usr/bin/env bash
# Hostamar radar - one pass over every layer that can break; catch it, optionally auto-fix.
#
#   radar.sh                 plain pass, ~60s (probes the live site + local box)
#   radar.sh --deep          + billing/store test suites (slow, hits live DB, calls the model gateway)
#   radar.sh --fix           restart containers / user services that should be up (capped 3/hour)
#   radar.sh --tail FILE     also parse a `wrangler tail --format=json` capture
#
# exit 0 = all green, 1 = at least one FAIL. WARN/SKIP never fail the run.
# log: $LOG   daily report: $DAILY/YYYY-MM-DD.md   tail: $TAIL_FILE
# NOTE: no `pipefail` - `curl ... | grep -q pat` makes grep exit on first match, curl then dies
# with SIGPIPE (141) and pipefail would report the whole pipeline as failed even on a match.
set -u

SITE=${SITE:-https://hostamar.com}
ROOT=${ROOT:-/home/romel/hostamar.com}
BUILD=${BUILD:-/home/romel/hostamar-build}
LOG=${LOG:-/home/romel/logs/radar.log}
DAILY=${DAILY:-/home/romel/logs/radar/daily}
TAIL_FILE=${TAIL_FILE:-/home/romel/logs/tail_radar.json}
FIXCOUNT=${FIXCOUNT:-/home/romel/logs/radar.fixcount}
EXPECT_MODELS=${EXPECT_MODELS:-176}
EXPECT_FREE=${EXPECT_FREE:-48}
EXPECT_CONTAINERS=(${EXPECT_CONTAINERS:-hostamar-tv-rtmp hostamar-minio hostamar-code-server hostamar-openwebui hostamar-uptime puppy-linux})
ROUTES=(/ /store /pricing /dashboard/decisions /tv /docs /sitemap.xml /api/v1/models /api/v1/free-models /download /coinlab /labs /blog/ai-video-bangla)
OG_PAGES=(/ /store /pricing /download /coinlab /labs)
PLANS=('৳990' '৳1900' '৳2900')
USER_UNITS=(hostamar-embedding-router hostamar-jev hostamar-litserve hostamar-ollama hostamar-tunnel hostamar-comfy-worker hostamar-provisioner-native)

DEEP=0; FIX=0; QUIET=0
while [ $# -gt 0 ]; do case "$1" in
  --deep) DEEP=1;; --fix) FIX=1;; --quiet) QUIET=1;;
  --tail) TAIL_FILE=${2:-}; shift;;
  -h|--help) sed -n '2,12p' "$0"; exit 0;;
  *) echo "unknown arg: $1" >&2; exit 2;; esac; shift; done

mkdir -p "$(dirname "$LOG")" "$DAILY"
RUN=(); FAILS=0; WARNS=0; SKIPS=0
ts() { date '+%F %T'; }
say() { RUN+=("$(ts) $1"); [ "$QUIET" = 1 ] || echo "$1"; }
ok()   { say "OK   $1 | $2"; }
warn() { WARNS=$((WARNS+1)); say "WARN $1 | $2"; }
fail() { FAILS=$((FAILS+1)); say "FAIL $1 | $2"; }
skip() { SKIPS=$((SKIPS+1)); say "SKIP $1 | $2"; }
code() { curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$1" 2>/dev/null || echo 000; }
body() { curl -sS --max-time 20 "$1" 2>/dev/null; }
jget() { python3 -c "import sys,json
try: d=json.load(sys.stdin)
except Exception: print(''); raise SystemExit
for k in sys.argv[1].split('.'):
    d = d.get(k) if isinstance(d,dict) else None
    if d is None: break
print('' if d is None else d)" "$1"; }
jsonlen() { python3 -c "import sys,json
try: d=json.load(sys.stdin)
except Exception: print('ERR'); raise SystemExit
if isinstance(d,list): print(len(d)); raise SystemExit
for k in ('data','models','results'):
    if isinstance(d.get(k),list): print(len(d[k])); raise SystemExit
print(d.get('count','ERR'))"; }
nvsmi() { command -v nvidia-smi 2>/dev/null || echo /usr/lib/wsl/lib/nvidia-smi; }
can_fix() { local c h; read -r c h < <(cat "$FIXCOUNT" 2>/dev/null || echo "0 0")
  [ "${h:-0}" = "$(( $(date +%s) / 3600 ))" ] || c=0; [ "${c:-0}" -lt 3 ]; }
did_fix() { local c h; read -r c h < <(cat "$FIXCOUNT" 2>/dev/null || echo "0 0")
  [ "${h:-0}" = "$(( $(date +%s) / 3600 ))" ] || c=0
  echo "$(( c + 1 )) $(( $(date +%s) / 3600 ))" > "$FIXCOUNT"; }

# ---------- L1 edge: routes + OG ----------
bad=(); for r in "${ROUTES[@]}"; do c=$(code "$SITE$r?radar=$(date +%s%N)"); [ "$c" = 200 ] || bad+=("$r:$c"); done
[ ${#bad[@]} -eq 0 ] && ok "L1 routes" "${#ROUTES[@]}/${#ROUTES[@]} x200" || fail "L1 routes" "bad: ${bad[*]}"

ogmiss=(); for p in "${OG_PAGES[@]}"; do body "$SITE$p" | grep -q 'og:image' || ogmiss+=("$p"); done
[ ${#ogmiss[@]} -eq 0 ] && ok "L1 og:tags" "${#OG_PAGES[@]} pages carry og:image" || fail "L1 og:tags" "missing: ${ogmiss[*]}"
read -r ogs ot <<<"$(curl -sS -o /dev/null -w '%{size_download} %{content_type}' --max-time 20 "$SITE/opengraph-image.png")"
oc=$(code "$SITE/opengraph-image.png")
[ "$oc" = 200 ] && [ "$ot" = image/png ] && [ "$ogs" -gt 50000 ] \
  && { [ "$ogs" = 52438 ] && ok "L1 og:image" "200 image/png $ogs B" || warn "L1 og:image" "200 image/png $ogs B (was 52438 - rebuilt?)"; } \
  || fail "L1 og:image" "http=$oc type=$ot bytes=$ogs"

# ---------- L2 app: health, catalog, pins ----------
h=$(body "$SITE/api/health")
st=$(printf '%s' "$h" | jget status); db=$(printf '%s' "$h" | jget database.connected)
[ "$st" = healthy ] && [ "$db" = True ] && ok "L2 health" "status=healthy db=connected" || fail "L2 health" "status=${st:-none} db=${db:-none}"
for pair in "models:$EXPECT_MODELS:api/v1/models" "free-models:$EXPECT_FREE:api/v1/free-models"; do
  IFS=: read -r nm exp url <<<"$pair"
  n=$(body "$SITE/$url" | jsonlen)
  [ "$n" = "$exp" ] && ok "L2 $nm" "$n rows" || { [ "$n" = 0 ] || [ "$n" = ERR ] && fail "L2 $nm" "$n (expect $exp)" || warn "L2 $nm" "$n rows (expect $exp)"; }
done
gm=$(body "$SITE/api/v1/good-models")
printf '%s' "$gm" | grep -q 'no-redis' && warn "L2 good-models" "no-redis: UPSTASH_REDIS_* unset on the Worker -> route is a no-op" || ok "L2 good-models" "served"
pins=$(body "$SITE/api/decision?pins=1" | python3 -c "import sys,json
try: print(len(json.load(sys.stdin).get('pins') or {}))
except Exception: print(0)")
[ "$pins" = 6 ] && ok "L2 pins" "6/6" || fail "L2 pins" "$pins/6"
ac=$(code "$SITE/api/decision"); [ "$ac" = 401 ] && ok "L2 decision auth" "audit baseline 401" || warn "L2 decision auth" "unauthenticated GET = $ac (expect 401)"

# ---------- L3 db: receipts dual-write ----------
if [ -f "$BUILD/jev-server.py" ]; then
  m=$(timeout 120 python3 "$BUILD/jev-server.py" --mirror-check 2>&1 | tail -1)
  printf '%s' "$m" | grep -q MATCH && ok "L3 receipts" "$m" || fail "L3 receipts" "${m:-no output}"
else skip "L3 receipts" "no $BUILD/jev-server.py"; fi

# ---------- L4 fleet + host ----------
running=$(podman ps --format '{{.Names}}' 2>/dev/null)
missing=(); for c in "${EXPECT_CONTAINERS[@]}"; do printf '%s\n' "$running" | grep -qx "$c" || missing+=("$c"); done
if [ ${#missing[@]} -eq 0 ]; then ok "L4 containers" "${#EXPECT_CONTAINERS[@]} up"
elif [ "$FIX" = 1 ] && can_fix; then
  fixed=()
  for c in "${missing[@]}"; do podman start "$c" >/dev/null 2>&1 && fixed+=("$c"); done; did_fix
  sleep 6; still=(); for c in "${missing[@]}"; do podman ps --format '{{.Names}}' | grep -qx "$c" || still+=("$c"); done
  [ ${#still[@]} -eq 0 ] && ok "L4 containers" "auto-fixed: ${fixed[*]}" || fail "L4 containers" "down after fix: ${still[*]}"
else fail "L4 containers" "down: ${missing[*]} (run radar.sh --fix)"; fi
for u in "${USER_UNITS[@]}"; do systemctl --user is-active --quiet "$u" 2>/dev/null || warn "L4 unit $u" "not active"; done
[ "$(systemctl --user is-active hostamar-provisioner-native 2>/dev/null)" = active ] && ok "L4 provisioner" "native active (container Exited = deliberate)" || warn "L4 provisioner" "not active"
du=$(df --output=pcent / | tail -1 | tr -dc 0-9); [ "$du" -ge 90 ] && fail "L4 disk" "${du}% used" || { [ "$du" -ge 80 ] && warn "L4 disk" "${du}% used" || ok "L4 disk" "${du}% used"; }
g=$(timeout 15 "$(nvsmi)" --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
if [ -n "$g" ]; then u=$(echo "$g" | cut -d, -f1); t=$(echo "$g" | cut -d, -f2); p=$((u*100/t))
  [ "$p" -ge 95 ] && warn "L4 gpu" "${u}/${t} MiB (${p}%)" || ok "L4 gpu" "${u}/${t} MiB (${p}%)"
else skip "L4 gpu" "nvidia-smi unavailable (PATH needs /usr/lib/wsl/lib)"; fi
kc=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 12 http://127.0.0.1:3004 2>/dev/null)
[ "$kc" = 200 ] || [ "$kc" = 302 ] && ok "L4 uptime-kuma" "localhost:3004 -> $kc" || warn "L4 uptime-kuma" "localhost:3004 -> $kc"

# ---------- L5 infra: ssh, systemd, gate, WAF ----------
if systemctl is-active --quiet ssh.socket && ss -tln 2>/dev/null | grep -q ':2222'; then ok "L5 ssh" "ssh.socket active, listening on 2222"
else fail "L5 ssh" "ssh.socket=$(systemctl is-active ssh.socket 2>/dev/null) listener2222=$(ss -tln 2>/dev/null | grep -c ':2222')"; fi
f=$(systemctl --failed --no-legend --no-pager 2>/dev/null | wc -l); fu=$(systemctl --user --failed --no-legend --no-pager 2>/dev/null | wc -l)
[ "$f" = 0 ] && [ "$fu" = 0 ] && ok "L5 systemd" "0 failed (system+user)" || fail "L5 systemd" "system=$f user=$fu failed"
if [ -f "$ROOT/ops/decision-gate.sh" ]; then
  gs=$(timeout 180 bash "$ROOT/ops/decision-gate.sh" --selftest 2>&1 | tail -1)
  if printf '%s' "$gs" | grep -q SELFTEST_PASS; then ok "L5 gate" "SELFTEST_PASS"
  elif [ "$DEEP" = 1 ]; then fail "L5 gate" "${gs:-no output}"
  else warn "L5 gate" "not SELFTEST_PASS (${gs:0:60}) - judge quality, not code; --deep to make it fatal"; fi
fi
cf=$(body "$SITE/api/health" >/dev/null; curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -H 'Authorization: Bearer probe' "https://api.cloudflare.com/client/v4/zones/2aef176c6f2000da2af593f4890ec298/firewall/access_rules/rules" 2>/dev/null)
skip "L5 waf appsumo" "cannot self-check: tokens here are Zone:Read + worker-OAuth, neither has Firewall:Edit (10000). AppSumo 74.220.48.0/24 + 74.220.56.0/24 must be added in the dashboard: Security > WAF > Tools > IP Access Rules"

# ---------- L6 business ----------
pr=$(body "$SITE/pricing"); pm=(); for p in "${PLANS[@]}"; do printf '%s' "$pr" | grep -q "\"price\":\"${p#৳}\"" || pm+=("$p"); done
[ ${#pm[@]} -eq 0 ] && ok "L6 pricing" "3 plans live in JSON-LD (${PLANS[*]})" || fail "L6 pricing" "JSON-LD price missing: ${pm[*]}"
home=$(body "$SITE/")
printf '%s' "$home" | grep -q '"@type":"Product"' && ok "L6 seo product" "Product JSON-LD live on /" || fail "L6 seo product" "Product JSON-LD missing from /"
# FAQPage ships on /faq (app/faq/page.tsx) and /generate, NOT on / - probe the canonical /faq.
printf '%s' "$(body "$SITE/faq")" | grep -q '"@type":"FAQPage"' && ok "L6 seo faq" "FAQPage JSON-LD live on /faq" || warn "L6 seo faq" "FAQPage JSON-LD not on /faq (source: app/faq/page.tsx)"
sm=$(code "$SITE/sitemap.xml"); [ "$sm" = 200 ] && ok "L6 sitemap" "200" || fail "L6 sitemap" "$sm"

# ---------- L7 worker tail (optional) ----------
if [ -n "${TAIL_FILE:-}" ] && [ -s "$TAIL_FILE" ]; then
  out=$(python3 - "$TAIL_FILE" <<'PY'
import json,sys,collections,os
path=sys.argv[1]
# wrangler --format=json emits pretty-printed MULTI-LINE records -> stream-decode, not per-line
data=open(path,encoding='utf-8',errors='replace').read()
dec=json.JSONDecoder(); i=0; tot=okc=exceed=0; mx=0; cpu=0; cold=0
while True:
    j=data.find('{',i)
    if j<0: break
    try: d,end=dec.raw_decode(data,j)
    except Exception: i=j+1; continue
    i=end
    if not isinstance(d,dict) or 'outcome' not in d: continue
    tot+=1; c=d.get('cpuTime',0) or 0
    if d['outcome']=='ok': okc+=1
    if d['outcome']=='exceededCpu': exceed+=1
    cpu+=c; mx=max(mx,c); cold+= 1 if c>400 else 0
if not tot:
    print(f"SKIP|{os.path.getsize(path)}B captured, no parseable records yet")
else:
    msg=f"{tot} events ok={okc} exceededCpu={exceed} max_cpu={mx}ms mean_cpu={cpu//tot}ms cold>400ms={cold} ({100*cold//tot}%)"
    if exceed==0: print("OK|"+msg)
    elif exceed*1000 >= 5*tot: print("FAIL|"+msg)          # >0.5% kills = real limit
    else: print("WARN|"+msg)
PY
)
  case "${out%%|*}" in
    OK) ok "L7 tail" "${out#*|}";; WARN) warn "L7 tail" "${out#*|}";; FAIL) fail "L7 tail" "${out#*|}";; *) skip "L7 tail" "${out#*|}";;
  esac
else skip "L7 tail" "no capture at ${TAIL_FILE:-unset} (tail-radar.service runs: env -u CLOUDFLARE_API_TOKEN wrangler tail hostamar-pages)"; fi

# ---------- deep: suites ----------
if [ "$DEEP" = 1 ]; then
  for t in test-billing test-store; do
    if [ -f "$ROOT/scripts/$t.mjs" ]; then
      r=$(cd "$ROOT" && timeout 300 node "scripts/$t.mjs" 2>&1 | grep -E '^[0-9]+/[0-9]+ (PASS|FAIL)' | tail -1)
      printf '%s' "$r" | grep -qE '^([0-9]+)/\1 PASS' && ok "L2 $t" "$r" || fail "L2 $t" "${r:-no result}"
    fi
  done
fi

# ---------- report ----------
{
  echo "== $(ts) =="
  printf '%s\n' "${RUN[@]}"
  echo "-- FAIL=$FAILS WARN=$WARNS SKIP=$SKIPS total=${#RUN[@]}"
} >> "$LOG"
D="$DAILY/$(date +%F).md"
[ -f "$D" ] || printf '# Hostamar radar %s\n\n' "$(date +%F)" >> "$D"
{ printf '## %s  FAIL=%s WARN=%s SKIP=%s\n```\n' "$(ts)" "$FAILS" "$WARNS" "$SKIPS"; printf '%s\n' "${RUN[@]}"; printf '```\n\n'; } >> "$D"
[ "$QUIET" = 1 ] || echo "radar: FAIL=$FAILS WARN=$WARNS SKIP=$SKIPS -> $D"
exit $(( FAILS > 0 ? 1 : 0 ))
