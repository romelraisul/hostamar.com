#!/usr/bin/env python3
"""HOSTAMAR WHATSAPI API - Send automated messages to creator groups"""
import os, json, requests
from datetime import datetime

BASE = "/mnt/c/Users/romel/hostamar-local"

# WhatsApp Business API Config
WA_CONFIG = {
    "api_url": os.environ.get("WA_API_URL", "https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID"),
    "access_token": os.environ.get("WA_ACCESS_TOKEN", ""),
    "phone_number_id": os.environ.get("WA_PHONE_ID", "")
}

# Groups/recipients
RECIPIENTS = [
    {"name": "YouTube Creators BD", "id": "100175148979565525"},
    {"name": "FB Video Editors", "id": "100175148979565510"},
    {"name": "Content Creators BD", "id": "100175148979565520"},
    {"name": "Digital Marketing BD", "id": "100175148979565530"},
    {"name": "Startup Bangladesh", "id": "100175148979565540"},
    {"name": "Video Pros BD", "id": "100175148979565550"},
    {"name": "Social Media Marketing BD", "id": "100175148979565560"},
]

MESSAGES = [
    "🎬 NEW: Hostamar.com is LIVE!\nAI video generation for Bangladesh creators.\n✅ 50+ templates\n✅ Bangla text support\n✅ 5 min video creation\n🎁 First 100 users: 50% OFF\nFree trial: 5 videos\n\nTry now: https://hostamar.com\nReply YES for demo!",
    
    "🚀 Tired of slow video editing?\nHostamar creates professional videos in 5 minutes!\n\nWhat's included:\n• 50+ professional templates\n• Full Bangla text support\n• 1080p HD export\n• No editing skills needed\n\nFree trial: https://hostamar.com\nPremium from ৳2,000/month",
    
    "💰 Make money faster with AI videos!\n\nReal results from our beta users:\n✅ @creator1: +300% watch time\n✅ @creator2: +৳15,000/month revenue\n✅ @creator3: 10x faster content creation\n\nJoin free: https://hostamar.com\nUpgrade: from ৳2,000/month",
]

def send_whatsapp_message(recipient_id, message):
    """Send message via WhatsApp Business API"""
    if not WA_CONFIG["access_token"]:
        print(f"⚠️  No WhatsApp API token. Saved for manual send to {recipient_id}")
        filepath = f"{BASE}/marketing-output/wa-queue/{recipient_id}.txt"
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            f.write(f"TO: {recipient_id}\n\n{message}")
        return False
    
    url = f"{WA_CONFIG['api_url']}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_id,
        "type": "text",
        "text": {"body": message}
    }
    headers = {
        "Authorization": f"Bearer {WA_CONFIG['access_token']}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            print(f"✅ Sent to {recipient_id}")
            return True
        else:
            print(f"❌ Failed {recipient_id}: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def broadcast_all():
    """Send all messages to all groups"""
    print("📱 WhatsApp Broadcast Starting...")
    results = []
    
    for msg_idx, message in enumerate(MESSAGES):
        print(f"\n--- Message {msg_idx + 1} ---")
        for group in RECIPIENTS:
            result = send_whatsapp_message(group["id"], message)
            results.append({"group": group["name"], "msg": msg_idx + 1, "sent": result})
    
    # Log results
    with open(f"{BASE}/logs/whatsapp-sent.json", 'w') as f:
        json.dump(results, f, indent=2)
    
    sent = sum(1 for r in results if r['sent'])
    print(f"\n📊 Results: {sent}/{len(results)} messages sent")
    return results

def save_for_manual():
    """Save messages as ready-to-copy files"""
    os.makedirs(f"{BASE}/marketing-output/wa-queue", exist_ok=True)
    
    for msg_idx, message in enumerate(MESSAGES):
        for group in RECIPIENTS:
            filepath = f"{BASE}/marketing-output/wa-queue/{group['name'].replace(' ', '_')}_msg{msg_idx}.txt"
            with open(filepath, 'w') as f:
                f.write(f"GROUP: {group['name']}\n\n{message}")
    
    total = len(RECIPIENTS) * len(MESSAGES)
    print(f"✅ {total} WhatsApp messages saved to marketing-output/wa-queue/")

if __name__ == "__main__":
    import sys
    if "--send" in sys.argv:
        broadcast_all()
    else:
        save_for_manual()
        print("\nUsage:")
        print("  python3 whatsapp-api.py          # Save to files")
        print("  python3 whatsapp-api.py --send    # Send via API (needs token)")