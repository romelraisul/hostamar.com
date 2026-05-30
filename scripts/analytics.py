#!/usr/bin/env python3
"""HOSTAMAR ANALYTICS DASHBOARD - Visitor tracking & reporting"""
import os, json
from datetime import datetime, timedelta

BASE = "/mnt/c/Users/romel/hostamar-local"
ANALYTICS_DIR = f"{BASE}/marketing-output/analytics"
os.makedirs(ANALYTICS_DIR, exist_ok=True)

# Simple page view tracker (frontend JS)
TRACKING_SCRIPT = """
<!-- Hostamar Analytics - Add to layout.tsx <head> -->
<script>
(function() {
  const page = window.location.pathname;
  const referrer = document.referrer || 'direct';
  const device = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const country = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Send to your analytics endpoint
  fetch('/api/track', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      page, referrer, device, country,
      timestamp: new Date().toISOString(),
      sessionId: localStorage.getItem('sessionId') || crypto.randomUUID()
    })
  }).catch(() => {});
  
  // Store session
  if (!localStorage.getItem('sessionId')) {
    localStorage.setItem('sessionId', crypto.randomUUID());
  }
})();
</script>
"""

# Plausible config
PLAUSIBLE_CONFIG = """
// For privacy-friendly analytics, use Plausible
// Add to layout.tsx:
// <script defer data-domain="hostamar.com" src="https://plausible.io/js/script.js"></script>

// Key metrics to track:
// - Page views (homepage, pricing, signup)
// - Signup conversion rate
// - Video creation events
// - Referral link clicks
// - Payment completion
"""

# Google Analytics 4 config
GA4_CONFIG = """
// Google Analytics 4 - Add to next.config.js:
// env: { GA_MEASUREMENT_ID: 'G-XXXXXXXXXX' }

// Track events in components:
// import * as ReactGA from 'react-ga4';
// ReactGA.initialize('G-XXXXXXXXXX');
// ReactGA.event({ category: 'Video', action: 'created', label: 'free_user' });
"""

# Conversion funnel tracking
FUNNEL_TRACKING = """
// Conversion Events to Track:
// 1. Landing page visit (homepage)
// 2. Click "Try Free" button
// 3. Signup started (email entered)
// 4. Signup completed
// 5. First video created
// 6. Upgrade clicked
// 7. Payment completed
// 8. Referral shared

// Facebook Pixel Integration:
// !function(f,b,e,v,n,t,s)
// {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
// n.callMethod.apply(n,arguments):n.queue.push(arguments)};
// if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
// n.queue=[];t=b.createElement(e);t.async=!0;
// t.src=v;s=b.getElementsByTagName(e)[0];
// s.parentNode.insertBefore(t,s)}(window, document,'script',
// 'https://connect.facebook.net/en_US/fbevents.js');
// fbq('init', 'YOUR_PIXEL_ID');
// fbq('track', 'PageView');
"""

with open(f"{ANALYTICS_DIR}/tracking-script.html", 'w') as f:
    f.write(TRACKING_SCRIPT)

with open(f"{ANALYTICS_DIR}/plausible-config.txt", 'w') as f:
    f.write(PLAUSIBLE_CONFIG)

with open(f"{ANALYTICS_DIR}/ga4-config.txt", 'w') as f:
    f.write(GA4_CONFIG)

with open(f"{ANALYTICS_DIR}/funnel-tracking.txt", 'w') as f:
    f.write(FUNNEL_TRACKING)

# Metrics dashboard spec
DASHBOARD_SPEC = {
    "metrics": {
        "daily_visitors": {"target": 100, "source": "plausible"},
        "signup_rate": {"target": "5%", "source": "database"},
        "video_creation_rate": {"target": "3%", "source": "database"},
        "conversion_rate": {"target": "1%", "source": "payments"},
        "referral_rate": {"target": "10%", "source": "referrals"}
    },
    "channels": {
        "organic_search": {"goal": "50 visits/day by month 2"},
        "facebook": {"goal": "200 visits/day by month 1"},
        "youtube": {"goal": "100 visits/day by month 2"},
        "referrals": {"goal": "50 visits/day by month 3"}
    }
}
with open(f"{ANALYTICS_DIR}/dashboard-spec.json", 'w') as f:
    json.dump(DASHBOARD_SPEC, f, indent=2, ensure_ascii=False)

print("✅ Analytics system built:")
print("   tracking-script.html      → Add to <head>")
print("   plausible-config.txt      → Privacy-friendly analytics")
print("   ga4-config.txt            → Google Analytics setup")
print("   funnel-tracking.txt       → Conversion tracking events")
print("   dashboard-spec.json       → KPI targets")