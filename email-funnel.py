#!/usr/bin/env python3
"""HOSTAMAR EMAIL FUNNEL SYSTEM - Welcome → Nurture → Convert → Re-engage"""
import os, json, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
EMAIL_FROM = os.environ.get("EMAIL_FROM", "")
EMAIL_PASS = os.environ.get("EMAIL_PASSWORD", "")
BASE = "/mnt/c/Users/romel/hostamar-local"
LEADS_FILE = f"{BASE}/data/leads.json"

def load_leads():
    os.makedirs(f"{BASE}/data", exist_ok=True)
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_leads(leads):
    with open(LEADS_FILE, 'w') as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)

def add_lead(name, email, source="website"):
    leads = load_leads()
    import hashlib
    leads.append({
        "name": name, "email": email, "source": source,
        "created": datetime.now().isoformat(), "stage": "new",
        "videos_used": 0, "last_contact": datetime.now().isoformat(),
        "referral_code": "REF-" + hashlib.md5(email.encode()).hexdigest()[:8].upper()
    })
    save_leads(leads)
    return leads[-1]

TEMPLATES = {
    "welcome": {
        "subject": "🎉 Welcome to Hostamar! 5 free videos ready",
        "body": "Hi {name},\n\nWelcome! Your 5 FREE videos are waiting.\n\n1. Login → https://hostamar.com/login\n2. Choose template\n3. Upload photos\n4. Generate & Download!\n\nP.S. Upgrade to Starter (৳2,000/mo) for unlimited access.\n\nBest,\nRomel Raisul"
    },
    "nurture_1": {
        "subject": "🎬 How @creator made 10 videos in 1 hour",
        "body": "Hi {name},\n\nOne of our users went from 3 hours to 15 minutes per video!\n\nResults:\n⏱️ 3 hours → 15 minutes\n📈 +40% views\n💰 +৳15,000/month\n\nTry it: https://hostamar.com"
    },
    "nurture_2": {
        "subject": "📱 New: Bangla text animation!",
        "body": "Hi {name},\n\n✨ BANGLA TEXT ANIMATION just added!\n✅ Animated Bangla titles\n✅ 10+ Bangla fonts\n✅ RTL support\n\nTry free: https://hostamar.com\n\nYour referral code: {referral_code}"
    },
    "convert": {
        "subject": "🔥 50% OFF ends tonight!",
        "body": "Hi {name},\n\nYou've created {videos_used} free videos.\n\n🚀 STARTER: ৳2,000/mo (10 videos, all templates, HD)\n🏢 BUSINESS: ৳3,500/mo (30 videos, custom templates, API, 4K)\n\n🎁 50% OFF first 100 customers!\n❌ Normal: ৳4,000 | ৳7,000\n✅ Today: ৳2,000 | ৳3,500\n\n👉 https://hostamar.com/pricing"
    },
    "reengage_1": {
        "subject": "We miss you! New templates dropped 🎨",
        "body": "Hi {name},\n\nIt's been {days_inactive} days!\n\nWhat's new:\n🆕 10 templates\n⚡ 2x faster rendering\n📱 5 new Bangla fonts\n🎬 Batch creation\n\n{videos_left} free videos waiting!\nLogin: https://hostamar.com/login"
    },
    "reengage_2": {
        "subject": "Final notice: Free videos expire in 3 days",
        "body": "Hi {name},\n\nYour {videos_left} free videos expire in 3 days.\n\nDon't waste them! Create:\n🎬 YouTube thumbnails\n📱 Facebook Reels\n📺 Educational content\n\nLogin → https://hostamar.com/login\n\nOr upgrade: https://hostamar.com/pricing"
    }
}

def send_email(to_name, to_email, template_name, **kwargs):
    if template_name not in TEMPLATES:
        return False
    t = TEMPLATES[template_name]
    subject = t["subject"]
    body = t["body"].format(name=to_name, **kwargs)
    
    if not EMAIL_FROM or not EMAIL_PASS:
        d = f"{BASE}/marketing-output/email-queue"
        os.makedirs(d, exist_ok=True)
        with open(f"{d}/{template_name}_{to_name.replace(' ', '_')}.txt", 'w', encoding='utf-8') as f:
            f.write(f"TO: {to_email}\nSUBJECT: {subject}\n\n{body}")
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except:
        return False

def save_all_emails():
    d = f"{BASE}/marketing-output/email-queue"
    os.makedirs(d, exist_ok=True)
    for name, t in TEMPLATES.items():
        body = t["body"].format(name="[Name]", referral_code="REF-XXXX1234", videos_used="3", days_inactive="7", videos_left="2")
        with open(f"{d}/{name}_ready.txt", 'w', encoding='utf-8') as f:
            f.write(f"SUBJECT: {t['subject']}\n\n{body}")
    print(f"✅ 6 email templates saved to {d}/")

if __name__ == "__main__":
    import sys
    if "--full" in sys.argv:
        if not load_leads():
            add_lead("Rahim", "rahim@demo.com", "facebook")
            add_lead("Karim", "karim@demo.com", "youtube")
        run = lambda: [send_email(l['name'], l['email'], 
            "welcome" if l['stage']=="new" else 
            "nurture_1" if l['stage']=="welcome" else
            "convert" if l['stage']=="nurture" else "reengage_1") for l in load_leads()]
        run()
    else:
        save_all_emails()