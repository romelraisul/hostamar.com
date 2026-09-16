#!/usr/bin/env bash
# safety-review.sh — monitor for GUARD, the Account Safety employee.
#
# Deterministic ban/termination-risk audit across every account this box touches.
# The failure mode being watched for is NOT a crash: it is a script that quietly
# mass-posts, mass-replies, scrapes, or re-uploads someone else's content and gets
# the owner's account suspended. So this asserts the CONCRETE triggers.
#
# Output is byte-stable (no timestamps, no counters that advance on their own) so
# it can gate a cron monitor; a change here means a durable safety fact changed.
# Exit 0 always — a finding is data to report, not a failed tick.

echo "# ACCOUNT SAFETY"

# 1. Armed automation that speaks as the owner. A canned reply loop with no
#    de-dupe is the classic suspension pattern.
RC=/home/romel/hostamar-build/scripts/reply-comments.mjs
[ -f "$RC" ] && echo "auto_reply=present" || echo "auto_reply=absent"
if [ -f "$RC" ]; then
  for k in since_id loadSeen MAX_PER_RUN KILL_SWITCH PER_REPLY_DELAY; do
    grep -q "$k" "$RC" && echo "rail_${k}=yes" || echo "rail_${k}=MISSING"
  done
fi
[ -f /home/romel/.hermes/state/x-autoreply-OFF ] && echo "x_kill_switch=engaged" || echo "x_kill_switch=NOT_ENGAGED"
echo "x_creds_are_stub=$(grep -hE '^X_API_KEY=' /home/romel/hostamar-build/.env.local /home/romel/hostamar-build/.env 2>/dev/null | grep -c 'stub_')"

# 2. Scheduled jobs that touch third-party accounts.
echo "external_cron_jobs=$(crontab -l 2>/dev/null | grep -vE '^\s*#|^\s*$' | grep -icE 'reply-comments|marketing|seo-automation|content-pipeline|social|post|upload')"

# 3. Credentials that would let an automation ACT. Stub = inert.
echo "yt_oauth_configured=$(grep -hE '^YOUTUBE_REFRESH_TOKEN=' /home/romel/hostamar-build/.env.local /home/romel/hostamar-build/.env 2>/dev/null | grep -cv 'stub_')"
echo "fb_token_configured=$(grep -hE '^(FACEBOOK_PAGE_ACCESS_TOKEN|FB_PAGE_ACCESS_TOKEN)=' /home/romel/hostamar-build/.env.local /home/romel/hostamar-build/.env 2>/dev/null | grep -cv 'stub_\|=""')"

# 4. Content provenance on the PUBLIC TV channel. YouTube's inauthentic-content
#    policy (formerly "repetitious content") makes generic/repetitive/mass-produced
#    loops ineligible, and a channel built on other people's or public-domain
#    footage is exactly what gets removed. Third-party material must not be the
#    MAIN strategy.
DB=$(grep -h '^DATABASE_URL=' /home/romel/hostamar-build/.env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | sed 's/&channel_binding=require//')
if [ -n "$DB" ]; then
  vt=$(psql "$DB" -tAc "SELECT count(*) FROM \"TvPlaylistItem\" WHERE source='viral';" 2>/dev/null || echo 0)
  ot=$(psql "$DB" -tAc "SELECT count(*) FROM \"TvPlaylistItem\" WHERE source<>'viral';" 2>/dev/null || echo 0)
  echo "tv_thirdparty_items=${vt:-0}"
  echo "tv_own_items=${ot:-0}"
  # is the channel MOSTLY other people's content? (the removal trigger)
  if [ "${vt:-0}" -gt 0 ] && [ "${ot:-0}" -eq 0 ]; then echo "tv_content_mix=ALL_THIRDPARTY"; else echo "tv_content_mix=mixed_or_own"; fi
fi

# 5. Secrets in git — a leaked token is account takeover, not just a ban.
cd /home/romel/hostamar-build 2>/dev/null || exit 0
echo "tracked_env_files=$(git ls-files 2>/dev/null | grep -cE '^\.env($|\.)')"
leak=no
for f in $(git ls-files 2>/dev/null | grep -E '^\.env' | head -10); do
  grep -qE '^(X_|FACEBOOK_|YOUTUBE_|B2_|TELEGRAM_|CLOUDFLARE_|OPENAI_|DATABASE_URL)[A-Z_]*=[^"'"'"']?[A-Za-z0-9_/-]{24,}' "$f" 2>/dev/null && { echo "SECRET_TRACKED=$f"; leak=yes; }
done
[ "$leak" = "no" ] && echo "secret_tracked=none"
# uncommitted secret-bearing files that could be pushed by accident
echo "dirty_env_files=$(git status --porcelain 2>/dev/null | grep -cE '^\s*[MAD?]{1,2} \.env')"
# --- shift gate -------------------------------------------------------------
# A pure audit script would be byte-identical whenever everything is healthy, so
# the monitor would suppress this employee forever and the risk register would
# never be updated. Same self-consuming gate as the TV operator: open once per
# SHIFT_HOURS, close on the spot. Any change in the audit lines above still wakes
# the agent immediately.
STATE=$HOME/.hermes/state/guard-shift
mkdir -p "$(dirname "$STATE")"
now=$(date +%s)
last=0
[ -f "$STATE" ] && last=$(cat "$STATE" 2>/dev/null || echo 0)
case "$last" in ''|*[!0-9]*) last=0;; esac
if [ $(( now - last )) -ge $(( 6 * 3600 )) ]; then
  echo "review_pending=yes"
  printf '%s' "$now" > "$STATE"
else
  echo "review_pending=no"
fi
# NOTE: no age value here - an hour-ticking value would change the hash hourly
# and wake the agent every tick instead of every SHIFT_HOURS.
# 6. THIRD-PARTY FOOTAGE ON OUR OWN PROPERTIES.
#    CHANNEL once copied 33 CC0/downloaded clips into public/tv/ and put them on the
#    /tv shelf, presenting other people's work as ours (reused-content + copyright
#    risk). .gitignore now blocks the patterns; this asserts the block still holds.
cd /home/romel/hostamar-build 2>/dev/null || exit 0
tp_tracked=$(git ls-files 'public/tv/*.mp4' 2>/dev/null | grep -cE '(^|/)(cc0_|clean_cc0_|cmt[0-9])' || true)
echo "thirdparty_on_edge_tracked=$((tp_tracked+0))"
tp_page=$(grep -cE "f: '(cc0_|clean_cc0_|cmt[0-9])" app/tv/page.tsx 2>/dev/null || true)
echo "thirdparty_cards_on_tv_page=$((tp_page+0))"
# the live encoder playlist must be our content, not third-party
pl=docker/tv-station/videos/playlist.host.txt
if [ -f "$pl" ]; then
  echo "playlist_thirdparty=$(grep -cE '(cc0_|clean_cc0_|/viral/|cmt[0-9])' "$pl" 2>/dev/null || true)"
  echo "playlist_total=$(grep -c '^file ' "$pl" 2>/dev/null || true)"
fi
# and the ignore guard must still exist
echo "ignore_guard=$(grep -c 'Third-party footage must NEVER ship' .gitignore 2>/dev/null || true)"
echo "# END SAFETY"
