#!/bin/bash
# HOSTAMAR 100 CUSTOMER MASTER EXECUTION PLAN
# ============================================
# Usage: bash scripts/master-plan.sh [day]
# Run daily to execute that day's tasks
# Run without args for full plan overview

set -e

PLAN_DIR="/mnt/c/Users/romel/hostamar-local"
LOG_DIR="$PLAN_DIR/logs"
mkdir -p "$LOG_DIR"

TODAY=$(date '+%Y-%m-%d')
DAY_OF_WEEK=$(date '+%u')  # 1=Mon, 7=Sun
LOG_FILE="$LOG_DIR/execution-$TODAY.log"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ============================================
# PHASE 1: FOUNDATION (Days 1-7)
# ============================================
phase_foundation() {
  log "📋 PHASE 1: Foundation (Day $1)"

  case $1 in
    1)
      log "✅ Finalize Prisma schema with CRM models"
      log "✅ Set up database (Neon PostgreSQL)"
      log "✅ Deploy to Vercel with env vars"
      ;;
    2)
      log "✅ Create CRM API routes (leads, outreach, pipeline, campaigns)"
      log "✅ Build dashboard data endpoints"
      log "✅ Test all API routes with curl"
      ;;
    3)
      log "✅ Set up payment integration (bKash/Nagad/USDT)"
      log "✅ Create payment webhook handler"
      log "✅ Test payment flow end-to-end"
      ;;
    4)
      log "✅ Design and build CRM dashboard page"
      log "✅ Build leads management page"
      log "✅ Build pipeline visualization"
      ;;
    5)
      log "✅ Create customer registration/login flow"
      log "✅ Set up NextAuth with credentials provider"
      log "✅ Test authentication flow"
      ;;
    6)
      log "✅ Create video generation queue system"
      log "✅ Build video status tracking"
      log "✅ Test video generation pipeline"
      ;;
    7)
      log "✅ Phase 1 review - all systems operational"
      log "✅ Begin Phase 2: Outreach"
      ;;
  esac
}

# ============================================
# PHASE 2: OUTREACH ENGINE (Days 8-21)
# ============================================
phase_outreach() {
  log "📋 PHASE 2: Outreach Engine (Day $1)"

  case $1 in
    8)
      log "📣 Launch Facebook Group cold outreach (50 contacts)"
      log "📧 Launch B2B email campaign (30 businesses)"
      log "💬 Start WhatsApp warm outreach (30 contacts)"
      ;;
    9)
      log "📣 Day 2 Facebook outreach (50 more)"
      log "🔄 Follow up Day 1 contacts"
      log "📊 Log all results in CRM"
      ;;
    10)
      log "📣 Day 3 Facebook outreach (50 more)"
      log "📧 Day 2 email campaign"
      log "🔄 Follow up interested contacts from Day 1-2"
      ;;
    11)
      log "📣 Day 4 Facebook outreach"
      log "💬 WhatsApp warm batch #3"
      log "🔄 Schedule demos for interested leads"
      ;;
    12)
      log "📣 Day 5 Facebook outreach"
      log "📧 Email batch #4"
      log "📞 Call high-priority leads"
      log "✅ Target: 200 total leads by end of week"
      ;;
    13)
      log "📊 WEEKLY REVIEW"
      log "📈 Analyze response rates by channel"
      log "📋 Update kanban board"
      log "🎯 Adjust messaging based on responses"
      ;;
    14)
      log "📣 Week 3 outreach begins"
      log "💬 Referral requests to first 10 paying customers"
      log "📧 Cold emails to 30 new businesses"
      log "🎯 Target: 300 total leads"
      ;;
    15)
      log "📣 Continue all channels"
      log "🔄 Follow up Week 2 interested leads"
      log "📊 Convert at least 5 leads to paid"
      ;;
    16)
      log "📣 Week 3 outreach continues"
      log "📧 Launch LinkedIn outreach (new channel)"
      log "🎯 Create referral program landing page"
      ;;
    17)
      log "📣 Outreach batch #12"
      log "📧 Email batch #8"
      log "🔄 Follow up all pending leads"
      log "🎯 Target: 400 total leads, 50 converted"
      ;;
    18|19|20|21)
      log "📣 Continued daily outreach"
      log "🔄 Daily follow-ups"
      log "📊 Track conversion metrics"
      log "🎯 Pacing: $(( ($1 - 7) * 25 )) leads, $(( ($1 - 10) * 3 )) paid"
      ;;
  esac
}

# ============================================
# PHASE 3: CONVERSION (Days 22-40)
# ============================================
phase_conversion() {
  log "📋 PHASE 3: Conversion Optimization (Day $1)"

  case $1 in
    22|23|24)
      log "🎯 Focus: Demo-to-paid conversion"
      log "📞 Personal calls to all demo-scheduled leads"
      log "💬 WhatsApp follow-up within 1 hour of demo"
      ;;
    25|26|27)
      log "🎯 Launch limited-time offer: 30% OFF for 48 hours"
      log "📣 Push notification to all trial users"
      log "📧 Email blast to all interested leads"
      ;;
    28|29|30)
      log "📊 Mid-phase review"
      log "🔄 Re-engage cold leads with new messaging"
      log "🎯 Target: 60 paid customers"
      ;;
    31|32|33)
      log "🤝 Referral push: Double bonus for referrals"
      log "📣 Test new channels: Instagram, YouTube Shorts"
      log "📧 Case study emails to warm leads"
      ;;
    34|35|36|37|38|39|40)
      log "📣 Continued daily outreach and follow-ups"
      log "🎯 Pacing: $(( ($1 - 20) * 4 )) paid customers"
      log "📊 Weekly conversion review every Sunday"
      ;;
  esac
}

# ============================================
# PHASE 4: SCALE (Days 41-60)
# ============================================
phase_scale() {
  log "📋 PHASE 4: Scale to 100 (Day $1)"

  case $1 in
    41|42|43|44|45)
      log "🎯 Target: 80 paid by Day 45"
      log "📣 Scale winning channels (double budget)"
      log "🤝 Referral program at maximum push"
      log "📧 Retarget cold leads with new offers"
      ;;
    46|47|48|49|50)
      log "🎯 Target: 90 paid by Day 50"
      log "📣 Launch partnership outreach (agencies, studios)"
      log "📊 A/B test pricing tiers"
      log "💬 WhatsApp broadcast to warm list"
      ;;
    51|52|53|54|55|56|57|58|59|60)
      log "🎯 FINAL PUSH: 100 paid customers"
      log "📣 Maximum outreach across all channels"
      log "🎁 Flash sale: 50% OFF annual plans"
      log "🤝 Aggressive referral bonuses"
      log "📊 Daily conversion tracking"
      ;;
  esac
}

# ============================================
# DAILY ROUTINE
# ============================================
daily_routine() {
  log "☀️ DAILY ROUTINE START"

  # 1. Check and process payments
  log "💳 Checking pending payments..."
  node "$PLAN_DIR/scripts/payment-verifier.js" &
  PAY_PID=$!
  sleep 5
  kill $PAY_PID 2>/dev/null

  # 2. Run outreach campaigns
  log "📣 Running outreach campaigns..."
  node "$PLAN_DIR/scripts/outreach-automation.js" run-all 2>&1 | tee -a "$LOG_FILE"

  # 3. Update pipeline snapshot
  log "📊Updating pipeline snapshot..."
  curl -s -X POST "$PLAN_DIR/api/crm/pipeline" | tee -a "$LOG_FILE" || true

  # 4. Follow-up reminders
  log "🔄 Checking follow-ups..."
  curl -s "$PLAN_DIR/api/crm/followups?pending=true" | tee -a "$LOG_FILE" || true

  # 5. Dashboard refresh
  log "📈 Updating dashboard metrics..."
  curl -s "$PLAN_DIR/api/crm/pipeline" | tee -a "$LOG_FILE" || true

  log "🌙 DAILY ROUTINE COMPLETE"
}

# ============================================
# MAIN
# ============================================
echo ""
echo "============================================"
echo "  🎯 HOSTAMAR 100 CUSTOMER PLAN"
echo "  Date: $TODAY"
echo "============================================"
echo ""

if [ -z "$1" ]; then
  echo "📋 FULL 60-DAY EXECUTION PLAN"
  echo "============================================"
  echo "  Phase 1 (Days 1-7):    Foundation & Setup"
  echo "  Phase 2 (Days 8-21):   Outreach Engine"
  echo "  Phase 3 (Days 22-40):  Conversion Optimization"
  echo "  Phase 4 (Days 41-60):  Scale to 100"
  echo ""
  echo "  TARGETS:"
  echo "    📋 Leads:             1000+"
  echo "    🤝 Interested:        200+"
  echo "    📞 Demos:             100+"
  echo "    ✅ Converted:         100 paid"
  echo "    💰 Revenue:           ৳300,000/mo"
  echo ""
  echo "  RUN: bash scripts/master-plan.sh [day-number]"
  echo "       bash scripts/master-plan.sh daily"
  echo "============================================"
elif [ "$1" = "daily" ]; then
  daily_routine
else
  DAY=$1
  if [ "$DAY" -ge 1 ] && [ "$DAY" -le 7 ]; then
    phase_foundation "$DAY"
  elif [ "$DAY" -ge 8 ] && [ "$DAY" -le 21 ]; then
    phase_outreach "$DAY"
  elif [ "$DAY" -ge 22 ] && [ "$DAY" -le 40 ]; then
    phase_conversion "$DAY"
  elif [ "$DAY" -ge 41 ] && [ "$DAY" -le 60 ]; then
    phase_scale "$DAY"
  else
    log "❌ Day must be 1-60"
  fi
fi