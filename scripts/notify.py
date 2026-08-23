#!/usr/bin/env python3
"""
notify.py — TV workflow notifications.

Sends Telegram message if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set in env
(or ~/.hermes/.env). ALWAYS logs to TvLog (Neon) regardless, so the event is
never lost. Never raises.
"""
import json
import os
import sys
import urllib.request

REPO = '/home/romel/hostamar-build'


def _load_env_key(name):
    v = os.environ.get(name)
    if v:
        return v
    p = os.path.join(os.path.expanduser('~'), '.hermes', '.env')
    try:
        for line in open(p):
            if line.startswith(name + '='):
                return line.strip().split('=', 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            u = line.strip().split('=', 1)[1].strip().strip('"')
            return u.replace('&channel_binding=require', '').replace('-pooler.', '.')
    return None


def tvlog(level, message):
    url = db_url()
    if not url:
        return
    try:
        import psycopg2
        conn = psycopg2.connect(url)
        with conn.cursor() as cur:
            cur.execute('INSERT INTO "TvLog" (id, level, message, "createdAt") '
                        "VALUES (gen_random_uuid()::text, %s, %s, NOW())", (level, message[:500]))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[notify] tvlog failed: {str(e)[:100]}", file=sys.stderr)


def telegram(text):
    token = _load_env_key('TELEGRAM_BOT_TOKEN')
    chat_id = _load_env_key('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        print('[notify] telegram not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID missing)')
        return False
    try:
        payload = json.dumps({"chat_id": chat_id, "text": text}).encode()
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage',
                                     data=payload, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        print(f'[notify] telegram failed: {str(e)[:120]}', file=sys.stderr)
        return False


def main():
    msg = ' '.join(sys.argv[1:]).strip()
    if not msg:
        print('usage: notify.py <message>')
        sys.exit(2)
    sent = telegram(msg)
    tvlog('info', f'TV notify (tg={sent}): {msg}')
    print(f"[notify] telegram={sent} logged=yes")


if __name__ == '__main__':
    main()
