#!/usr/bin/env python3
"""
Customer email automation — V73
Sends customer-facing emails via Brevo SMTP or Gmail SMTP.
Used by Harbor employee for customer communication.

Prerequisite: configure SMTP or Brevo in ~/hostamar-build/.env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  OR
  BREVO_API_KEY=your-brevo-api-key

Usage:
  python3 ~/hostamar-build/scripts/email-customer.py --to recipient@example.com --subject "Hello" --body "Message" [--template welcome|payment|video-ready|reset]
"""

import argparse, json, os, smtplib, sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

HOME = Path("/home/romel")
ENV_FILE = HOME / "hostamar-build" / ".env"

# Email templates (matching lib/email-templates.ts)
TEMPLATES = {
    'welcome': {
        'subject': 'হোস্টামার-এ স্বাগতম! 🎉 আপনার ফ্রি ট্রায়াল শুরু হয়েছে',
        'body': """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎬 Hostamar</h1>
            <p style="color: #d4e5ff; margin: 8px 0 0;">AI ভিডিও জেনারেশন প্ল্যাটফর্ম</p>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">নমস্কার <strong>{name}</strong>!</p>
            <p>আপনি সফলভাবে হোস্টামারে রেজিস্টার করেছেন। আপনার ৭ দিনের ফ্রি ট্রায়াল এখন সক্রিয়!</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e293b; margin-top: 0;">🎁 আপনার ফ্রি ট্রাইলার কী পাবেন?</h3>
              <ul style="color: #475569;">
                <li>✅ ৫টি ফ্রি AI ভিডিও</li>
                <li>✅ ৭২০p কোয়ালিটি</li>
                <li>✅ ৩টি টেমপ্লেট ব্যবহার</li>
                <li>✅ বাংলা টেক্সট সাপোর্ট</li>
              </ul>
            </div>
            <a href="{site_url}/generate" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              ভিডিও তৈরি শুরু করুন →
            </a>
            <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
              কোনো সাহায্য দরকার? আমাদের সাপোর্ট দলে যোগাযোগ করুন:<br>
              📧 support@hostamar.com
            </p>
          </div>
          <div style="background: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="color: #94a3b8; margin: 0;">© 2026 Hostamar.com</p>
          </div>
        </div>
        """
    },
    'payment': {
        'subject': '💳 পেমেন্ট সফলভাবে সম্পন্ন হয়েছে! — Hostamar',
        'body': """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">✅ পেমেন্ট সফল!</h1>
            <p style="color: #d1fae5; margin: 8px 0 0;">আপনার অর্ডার কনফার্ম হয়েছে</p>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <p>নমস্কার <strong>{name}</strong>,</p>
            <p>আপনার পেমেন্ট সফলভাবে প্রাপ্ত হয়েছে। নিচের বিবরণ দেখুন:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">অর্ডার আইডি:</td><td><strong>{order_id}</strong></td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">পেমেন্ট পদ্ধতি:</td><td>{payment_method}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">পরিমাণ:</td><td><strong>{amount}</strong></td></tr>
                <tr><td style="padding: 8px 0;">তারিখ:</td><td>{date}</td></tr>
              </table>
            </div>
            <a href="{site_url}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              ড্যাশবোর্ড দেখুন →
            </a>
          </div>
        </div>
        """
    },
    'video-ready': {
        'subject': '🎬 আপনার ভিডিও প্রস্তুত! — Hostamar',
        'body': """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ec4899, #db2777); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">🎬 ভিডিও প্রস্তুত!</h1>
            <p style="color: #f9a8d4; margin: 8px 0 0;">আপনার AI-তৈরি ভিডিও ডাউনলোড করতে প্রস্তুত</p>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <p>নমস্কার <strong>{name}</strong>,</p>
            <p>আপনার <strong>{video_title}</strong> ভিডিওটি সফলভাবে তৈরি হয়েছে!</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🎥</div>
              <p style="font-size: 18px; font-weight: bold; color: #1e293b;">{video_title}</p>
            </div>
            <a href="{video_url}" style="display: inline-block; background: #ec4899; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              ভিডিও দেখুন →
            </a>
          </div>
        </div>
        """
    }
}

DEFAULT_FROM = 'romelraisul@gmail.com'
DEFAULT_SITE_URL = 'https://hostamar.com'

def load_env():
    """Load relevant env vars from .env file."""
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                env[key.strip()] = val.strip().strip('"').strip("'")
    return env

def send_smtp(to, subject, html_body, env):
    """Send email via SMTP (Gmail or Brevo SMTP)."""
    host = env.get('SMTP_HOST', 'smtp.gmail.com')
    port = int(env.get('SMTP_PORT', '587'))
    user = env.get('SMTP_USER', '')
    password = env.get('SMTP_PASS', '')
    use_brevo_smtp = 'BREVO_SMTP_KEY' in env and env.get('BREVO_SMTP_KEY')

    if use_brevo_smtp:
        # Brevo SMTP uses API key as password and 'apikey' as username
        user = env.get('BREVO_SMTP_USER', 'apikey')
        password = env.get('BREVO_SMTP_KEY', '')

    if not user or not password:
        return {'success': False, 'error': 'SMTP credentials not configured', 'method': 'smtp'}

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'Hostamar <{user}>'
    msg['To'] = to

    part = MIMEText(html_body, 'html', 'utf-8')
    msg.attach(part)

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls()
        server.login(user, password)
        server.sendmail(user, [to], msg.as_string())
        server.quit()
        return {'success': True, 'method': 'smtp', 'host': host}
    except Exception as e:
        return {'success': False, 'error': str(e), 'method': 'smtp'}

def send_brevo_api(to, subject, html_body, env):
    """Send email via Brevo REST API."""
    api_key = env.get('BREVO_API_KEY', '')
    if not api_key:
        return {'success': False, 'error': 'BREVO_API_KEY not set', 'method': 'brevo_api'}

    import urllib.request, urllib.error, json as json_mod

    data = json_mod.dumps({
        'sender': {'name': 'Hostamar', 'email': DEFAULT_FROM},
        'to': [{'email': to}],
        'subject': subject,
        'htmlContent': html_body,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.brevo.com/v3/smtp/email',
        data=data,
        headers={
            'Content-Type': 'application/json',
            'api-key': api_key,
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode('utf-8')
            if resp.status == 201:
                return {'success': True, 'method': 'brevo_api', 'response': body[:200]}
            else:
                return {'success': False, 'error': f'Brevo API returned {resp.status}: {body[:200]}', 'method': 'brevo_api'}
    except urllib.error.HTTPError as e:
        return {'success': False, 'error': f'Brevo API HTTP {e.code}: {e.read().decode("utf-8")[:200]}', 'method': 'brevo_api'}
    except Exception as e:
        return {'success': False, 'error': str(e), 'method': 'brevo_api'}

def send_email(to, subject, html_body, env):
    """Send email via best available method."""
    # Try Brevo REST API first
    if env.get('BREVO_API_KEY'):
        log(f"  trying Brevo REST API...")
        result = send_brevo_api(to, subject, html_body, env)
        if result['success']:
            return result
        log(f"  Brevo API failed: {result.get('error')}")
    # Fallback to SMTP
    log(f"  trying SMTP ({env.get('SMTP_HOST', 'smtp.gmail.com')})...")
    result = send_smtp(to, subject, html_body, env)
    return result

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--to', required=True, help='Recipient email')
    parser.add_argument('--subject', help='Email subject (overrides template)')
    parser.add_argument('--body', help='Plain text body (for custom emails)')
    parser.add_argument('--template', choices=list(TEMPLATES.keys()), help='Template to use')
    parser.add_argument('--name', default='Customer', help='Recipient name for template')
    parser.add_argument('--from', dest='from_addr', default=DEFAULT_FROM, help='From address')
    parser.add_argument('--dry-run', action='store_true', help='Don\'t actually send')
    parser.add_argument('--json-out', action='store_true', help='Output result as JSON')
    args = parser.parse_args()

    env = load_env()
    log(f"Loaded env: SMTP={'yes' if env.get('SMTP_HOST') else 'no'} Brevo={'yes' if env.get('BREVO_API_KEY') else 'no'}")

    if args.template:
        tmpl = TEMPLATES[args.template]
        subject = args.subject or tmpl['subject']
        body_template = tmpl['body']
        replacements = {
            '{name}': args.name,
            '{site_url}': DEFAULT_SITE_URL,
            '{order_id}': 'ORD-' + datetime.now().strftime('%Y%m%d-%H%M%S'),
            '{payment_method}': 'bKash',
            '{amount}': '৳৫৯৯',
            '{date}': datetime.now().strftime('%Y-%m-%d'),
            '{video_title}': args.name,
            '{video_url}': DEFAULT_SITE_URL + '/tv',
        }
        html_body = body_template
        for k, v in replacements.items():
            html_body = html_body.replace(k, v)
    elif args.body:
        subject = args.subject or 'Hostamar'
        html_body = f"""
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <p>{args.body}</p>
        <p style="color:#999;font-size:12px;margin-top:24px">— Hostamar</p>
        </body></html>
        """
    else:
        print("ERROR: --template or --body required", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        log(f" DRY-RUN: would send to {args.to}")
        log(f"  subject: {subject}")
        log(f"  body (first 200 chars): {html_body[:200]}...")
        result = {'success': True, 'dry_run': True, 'method': 'dry_run'}
    else:
        log(f" Sending to {args.to}...")
        result = send_email(args.to, subject, html_body, env)
        log(f"  result: {result}")

    if args.json_out:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result.get('success'):
        log(f" ✓ Email sent to {args.to}")
    else:
        log(f" ✗ Failed: {result.get('error')}")
        sys.exit(1)

if __name__ == '__main__':
    main()
