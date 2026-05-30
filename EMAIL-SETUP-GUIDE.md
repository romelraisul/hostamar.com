# 📧 Hostamar Email Setup Guide

## Overview
Hostamar uses Gmail SMTP for sending transactional emails (welcome emails, password reset, payment receipts, marketing campaigns).

The email system is implemented in:
- `email-funnel.py` — Python email funnel (welcome → nurture → convert → re-engage)
- `marketing-engine.py` — Email campaign templates
- `emails/` — HTML email templates (welcome.html, reset.html, payment.html)

---

## Step 1: Choose Your Sender Email

### Option A: Gmail (Free, Recommended for Start)
Use any Gmail address. The `SMTP_USER` will be your Gmail address.

**Example:**
```
SMTP_USER=hostamar@gmail.com     # Your Gmail address
FROM_EMAIL=hostamar@gmail.com    # Same as SMTP_USER for consistency
```

### Option B: Custom Domain Email (Professional)
Use `support@hostamar.com` or `hello@hostamar.com`. You'll need:
1. Email hosting (Google Workspace ~$6/mo, Zoho Mail free tier)
2. Configure Gmail to send as this address

**For this guide, we'll use Option A (Gmail) for immediate setup.**

---

## Step 2: Enable 2-Factor Authentication (Required)

Google requires 2FA to use App Passwords:
1. Go to https://myaccount.google.com/security
2. Under "How you sign in to Google" → Click **2-Step Verification**
3. Follow the setup (usually needs phone verification)
4. **Turn it ON**

---

## Step 3: Generate Google App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. **Select app:** Choose "Mail"
4. **Select device:** Choose "Other (Custom name)"
5. **Enter name:** Type "Hostamar SMTP"
6. Click **GENERATE**
7. **IMPORTANT:** You'll see a 16-character password in a yellow box

   ```
   xxxx xxxx xxxx xxxx
   ```
   
8. **Copy it immediately** — you won't see it again!
9. Click **Done**

---

## Step 4: Configure Environment Variables

The system uses these exact environment variable names (based on `email-funnel.py`):

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `SMTP_HOST` | Gmail SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `EMAIL_FROM` | Sender email address | `hostamar@gmail.com` |
| `EMAIL_PASSWORD` | Google App Password (16 chars, no spaces) | `abcd efgh ijkl mnop` |

### Update ALL three env files:

**File 1: `.env`** (development)
```bash
# ===== EMAIL =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=hostamar@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # ← Replace with your Google App Password
FROM_EMAIL=hostamar@gmail.com          # ← Keep same as EMAIL_FROM
```

**File 2: `.env.local`** (local development)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=hostamar@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # ← Replace with your Google App Password
FROM_EMAIL=hostamar@gmail.com
```

**File 3: `.env.production`** (Vercel deployment)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=hostamar@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # ← Replace with your Google App Password
FROM_EMAIL=hostamar@gmail.com
```

**Also set these in Vercel Dashboard:**
Go to https://vercel.com/romelraisul/hostamar-local/settings/environment-variables
Add each variable:

| Name | Value |
|------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `EMAIL_FROM` | `hostamar@gmail.com` |
| `EMAIL_PASSWORD` | `abcd efgh ijkl mnop` (your app password) |
| `FROM_EMAIL` | `hostamar@gmail.com` |

---

## Step 5: Test the Setup

Run the email funnel to verify:

```bash
cd /mnt/c/Users/romel/hostamar-local
python3 email-funnel.py --test
```

Or test manually:
```bash
python3 -c "
import smtplib
from email.mime.text import MIMEText

host='smtp.gmail.com'
port=587
user='hostamar@gmail.com'
password='YOUR_APP_PASSWORD_GOES_HERE'

msg = MIMEText('Test email from Hostamar SMTP setup')
msg['Subject'] = 'Test from Hostamar'
msg['From'] = user
msg['To'] = user  # Send to yourself

server = smtplib.SMTP(host, port)
server.starttls()
server.login(user, password)
server.send_message(msg)
server.quit()
print('✅ Email sent successfully!')
"
```

---

## Step 6: Email Templates

The HTML email templates are in `emails/`:
- `emails/welcome.html` — Welcome email with onboarding steps
- `emails/reset.html` — Password reset email
- `emails/payment.html` — Payment confirmation/receipt

Customize these with your branding and content.

The Python email funnel (`email-funnel.py`) includes plain-text templates for:
- Welcome (5 free videos)
- Nurture series (success stories, feature announcements)
- Upgrade/promotion
- Re-engagement

---

## Troubleshooting

### "Username and Password not accepted"
- **Cause:** Wrong App Password or 2FA not enabled
- **Fix:** Generate a new App Password at https://myaccount.google.com/apppasswords

### "SMTP Authentication failed"
- **Cause:** Wrong email or password
- **Fix:** Double-check `EMAIL_FROM` and `EMAIL_PASSWORD` match exactly

### "Connection refused"
- **Cause:** Wrong `SMTP_HOST` or `SMTP_PORT`
- **Fix:** Use `smtp.gmail.com:587` (TLS) — do NOT use port 465 (SSL)

### "Daily sending limit reached"
- **Cause:** Gmail free tier limit (500 emails/day)
- **Fix:** Use a dedicated email service (SendGrid, Mailgun, Amazon SES) for high volume

### "Blocked by Google"
- **Cause:** Google's security detected unusual activity
- **Fix:** Check https://myaccount.google.com/lesssecureapps and allow access. Also check Gmail → Settings → Forwarding and POP/IMAP → Enable IMAP.

---

## Production Upgrade: Dedicated Email Service

When you exceed Gmail's limits (500/day), switch to:
- **SendGrid** — 100 emails/day free → $19.95/mo for 50K
- **Mailgun** — 5,000 emails/month free
- **Amazon SES** — 62,000 emails/month free (if from EC2)
- **Zoho Mail** — Free for 5 users with custom domain

Requires changing `SMTP_HOST` and port accordingly.
