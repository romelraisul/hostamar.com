#!/usr/bin/env python3
"""Uptime monitor for hostamar.com and staging.hostamar.com"""
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

LOG_FILE = '/home/romel/logs/uptime-monitor.log'
HEALTH_URLS = [
    ('hostamar', 'https://hostamar.com/api/health'),
    ('staging', 'https://staging.hostamar.com/api/health'),
    ('staging-www', 'https://staging-www.hostamar.com/api/health'),
    ('api', 'https://api.hostamar.com/api/health'),
]

def check(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'uptime-monitor/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, resp.read().decode()[:200]
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:
        return 0, str(e)

def log(msg):
    ts = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    line = f"{ts} {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()

    while True:
        for name, url in HEALTH_URLS:
            code, body = check(url)
            if code == 200:
                try:
                    data = json.loads(body)
                    status = data.get('status', 'unknown')
                    customers = data.get('database', {}).get('customers', '?')
                    log(f"UP {name} status={status} customers={customers}")
                except Exception:
                    log(f"UP {name} http=200 parse_error")
            else:
                log(f"DOWN {name} http={code} err={body[:120]}")

        if args.once:
            break
        time.sleep(60)

if __name__ == '__main__':
    main()
