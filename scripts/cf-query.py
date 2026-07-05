#!/usr/bin/env python3
import sys
import json
import urllib.request

def main():
    if len(sys.argv) < 3:
        print('ERROR', flush=True)
        return 0

    token = sys.argv[1]
    zone_id = sys.argv[2]
    record_name = sys.argv[3] if len(sys.argv) > 3 else 'hostamar.com'

    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?name={record_name}&type=CNAME"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print('ERROR', flush=True)
        return 0

    if not data.get('success'):
        print('ERROR', flush=True)
        return 0

    results = data.get('result', [])
    if not results:
        print('NONE', flush=True)
        return 0

    rtype = sys.argv[4] if len(sys.argv) > 4 else 'content'
    item = results[0]
    if rtype == 'id':
        print(item.get('id', 'ERROR'), flush=True)
    else:
        print(item.get('content', 'UNKNOWN'), flush=True)
    return 0

if __name__ == '__main__':
    main()
