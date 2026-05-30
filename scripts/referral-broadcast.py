#!/usr/bin/env python3
"""
HOSTAMAR REFERRAL WHATSAPP BROADCAST
Sends referral program promotions to creator groups via WhatsApp.

Usage:
  python3 scripts/referral-broadcast.py              # Save messages to files
  python3 scripts/referral-broadcast.py --send        # Send via WhatsApp API
  python3 scripts/referral-broadcast.py --dry-run     # Preview messages only
"""
import os, sys, json, requests
from datetime import datetime

BASE = "/mnt/c/Users/romel/hostamar-local"
LOGS_DIR = f"{BASE}/logs"
QUEUE_DIR = f"{BASE}/marketing-output/wa-queue"

# WhatsApp Business API Config
WA_CONFIG = {
    "api_url": os.environ.get("WA_API_URL", "https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID"),
    "access_token": os.environ.get("WA_ACCESS_TOKEN", ""),
    "phone_number_id": os.environ.get("WA_PHONE_ID", "")
}

# Target Groups (same as whatsapp-api.py)
RECIPIENTS = [
    {"name": "YouTube Creators BD", "id": "100175148979565525"},
    {"name": "FB Video Editors", "id": "100175148979565510"},
    {"name": "Content Creators BD", "id": "100175148979565520"},
    {"name": "Digital Marketing BD", "id": "100175148979565530"},
    {"name": "Startup Bangladesh", "id": "100175148979565540"},
    {"name": "Video Pros BD", "id": "100175148979565550"},
    {"name": "Social Media Marketing BD", "id": "100175148979565560"},
]

# Broadcast messages focusing on referral/launch
MESSAGES = [
    # Message 1: Launch + Referral
    """🎬 HOSTAMAR LIVE - Refer Your Friends & Earn Free Credits!

🚀 Hostamar.com - AI video generation for Bangladesh creators is NOW LIVE!

✨ What you get:
• 50+ professional templates (YouTube, FB, TikTok)
• Full Bangla text support
• 1080p HD export in 5 minutes
• 🆓 5 free videos/month to start

🎁 REFERRAL BONUS:
• Invite a friend → You both get 5 FREE credits!
• Friend signs up, gets 8 credits instead of 3
• Friend upgrades → You get 10 more credits!
• No limit on referrals - keep earning!

👉 Sign up free: https://hostamar.com/signup
📱 Your referral link available at hostamar.com/referral

#Hostamar #AIvideo #Bangladesh #ContentCreator""",

    # Message 2: Referral focused
    """💰 EARN FREE CREDITS - Invite Friends to Hostamar!

Know someone who needs AI video generation? Here's what happens:

✅ You share your referral link
✅ They sign up → both get 5 FREE credits 🎉
✅ They make first payment → you get 10 MORE credits!
✅ Unlimited referrals = unlimited free credits

🎬 Hostamar features:
• AI-powered video creation
• 50+ templates - YouTube, FB, TikTok, Reels
• Bangla text & voice support
• Pay with bKash / Nagad / USDT
• Plans from ৳2,000/month

🔗 Get your referral link: https://hostamar.com/referral
🚀 Sign up free: https://hostamar.com/signup

#ReferralProgram #AIvideo #BangladeshTech #EarnCredits""",

    # Message 3: Quick launch promo
    """🎥 Make Professional Videos in 5 Minutes with AI!

Hostamar.com is LIVE and FREE to try!

✓ AI video generator - just type your script
✓ 50+ templates for any platform
✓ Full Bangla language support
✓ 1080p export, no watermark
✓ bKash & Nagad payments

🎁 REFER & EARN:
Share your referral link and earn free credits every time a friend joins. Unlimited earning potential!

👉 Start free: https://hostamar.com/signup
📱 Referral dashboard: https://hostamar.com/referral

Beta users get 50% OFF forever! Limited time offer. 🏃""",
]


def send_whatsapp_message(recipient_id, message):
    """Send message via WhatsApp Business API or save to file."""
    api_url = WA_CONFIG["api_url"]
    access_token = WA_CONFIG["access_token"]

    if not access_token or "YOUR_PHONE_NUMBER_ID" in api_url:
        # No API configured - save to file
        filepath = f"{QUEUE_DIR}/{recipient_id}.txt"
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"TO: {recipient_id}\n\n{message}")
        return False, "saved_to_file"

    url = f"{api_url}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_id,
        "type": "text",
        "text": {"body": message}
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            return True, "sent_via_api"
        else:
            return False, f"http_{resp.status_code}"
    except Exception as e:
        return False, f"error_{str(e)}"


def broadcast():
    """Execute the broadcast."""
    os.makedirs(LOGS_DIR, exist_ok=True)
    os.makedirs(QUEUE_DIR, exist_ok=True)

    print("=" * 60)
    print("📱 HOSTAMAR REFERRAL WHATSAPP BROADCAST")
    print("=" * 60)
    print(f"Groups: {len(RECIPIENTS)}")
    print(f"Messages: {len(MESSAGES)}")
    print(f"Total sends: {len(RECIPIENTS) * len(MESSAGES)}")
    print()

    results = []
    total_sent = 0
    total_failed = 0

    for msg_idx, message in enumerate(MESSAGES):
        print(f"\n--- Message {msg_idx + 1} ---")
        for group in RECIPIENTS:
            success, method = send_whatsapp_message(group["id"], message)
            status = "✅" if success else "📁" if method == "saved_to_file" else "❌"
            print(f"  {status} {group['name']}: {method}")
            results.append({
                "group": group["name"],
                "group_id": group["id"],
                "message_index": msg_idx + 1,
                "success": success or method == "saved_to_file",
                "method": method,
                "timestamp": datetime.utcnow().isoformat()
            })
            if success:
                total_sent += 1
            else:
                total_failed += 1

    summary = {
        "status": "completed",
        "total_sends": len(results),
        "successful": total_sent,
        "saved_to_files": sum(1 for r in results if r["method"] == "saved_to_file"),
        "failed": total_failed,
        "groups_targeted": [g["name"] for g in RECIPIENTS],
        "delivery_method": "api" if any(r["method"] == "sent_via_api" for r in results) else "saved_to_files",
        "referral_promo_included": True,
        "timestamp": datetime.utcnow().isoformat(),
        "results": results
    }

    # Save log
    log_path = f"{LOGS_DIR}/referral-broadcast-log.json"
    with open(log_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"📊 BROADCAST SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Status:          {summary['status']}")
    print(f"  Delivery:        {summary['delivery_method']}")
    print(f"  Files saved:     {summary['saved_to_files']}")
    print(f"  API sent:        {summary['successful']}")
    print(f"  Failed:          {summary['failed']}")
    print(f"  Log:             {log_path}")
    print(f"{'=' * 60}")

    return summary


def dry_run():
    """Preview messages without sending."""
    print("=" * 60)
    print("📱 DRY RUN - Message Preview")
    print("=" * 60)
    for msg_idx, message in enumerate(MESSAGES):
        print(f"\n{'─' * 60}")
        print(f"MESSAGE {msg_idx + 1}")
        print(f"{'─' * 60}")
        print(message)
    print(f"\n{'─' * 60}")
    print(f"Total: {len(MESSAGES)} messages × {len(RECIPIENTS)} groups = {len(MESSAGES) * len(RECIPIENTS)} sends")
    print(f"{'─' * 60}")


if __name__ == "__main__":
    if "--dry-run" in sys.argv:
        dry_run()
    elif "--send" in sys.argv:
        broadcast()
    else:
        broadcast()
        print("\nℹ️  Usage:")
        print("  python3 scripts/referral-broadcast.py          # Save to files + summary")
        print("  python3 scripts/referral-broadcast.py --send   # Send via API")
        print("  python3 scripts/referral-broadcast.py --dry-run # Preview only")
