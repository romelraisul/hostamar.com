#!/usr/bin/env python3
"""
Fleet 10-minute reporter — V73
Each employee runs this every 10 minutes to report status to hostamar.com /api/admin/fleet.

Usage:
  python3 ~/hostamar-build/scripts/fleet-report-10min.py <job_id> <employee_name> [--draft-dir DIR] [--extra "text"]
"""

import argparse, json, os, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

HOME = Path("/home/romel")
FLEET_URL = "https://hostamar.com/api/admin/fleet"
FLEET_SECRET_FILE = HOME / ".hermes" / "scripts" / "fleet.env"
REPORT_SCRIPT = HOME / ".hermes" / "scripts" / "fleet-report-push.sh"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def load_fleet_secret():
    if FLEET_SECRET_FILE.exists():
        for line in FLEET_SECRET_FILE.read_text().splitlines():
            if line.startswith('FLEET_REPORT_SECRET='):
                return line.split('=', 1)[1].strip()
    return None

def get_latest_cron_output(job_id):
    """Find the latest .md report in ~/.hermes/cron/output/<job_id>/"""
    out_dir = HOME / ".hermes" / "cron" / "output" / job_id
    if not out_dir.exists():
        return None
    md_files = sorted(out_dir.glob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True)
    if md_files:
        return md_files[0]
    return None

def parse_report(markdown_path):
    """Extract VERDICT, FINISHED, COULDNT, NEEDS YOU from report."""
    if not markdown_path or not markdown_path.exists():
        return {}
    text = markdown_path.read_text(encoding='utf-8')
    result = {}
    for key in ['VERDICT', 'FINISHED', 'COULDNT', 'NEEDS YOU']:
        m = re.search(rf'\*{key}:?\*?\s*(.+?)(?=\n\*|\n#|\Z)', text, re.S | re.I)
        if m:
            result[key.lower()] = m.group(1).strip()[:500]
    return result

def check_gateway():
    """Check localhost:4000 gateway status."""
    try:
        import urllib.request
        req = urllib.request.Request('http://localhost:4000/v1/models', method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return {'up': True, 'models': len(data.get('data', []))}
    except Exception:
        return {'up': False, 'models': 0}

def check_hostamar():
    """Check hostamar.com health."""
    try:
        import urllib.request
        req = urllib.request.Request('https://hostamar.com/api/health', method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {'status': resp.status}
    except Exception:
        return {'status': 'unreachable'}

def build_report(job_id, employee, draft_dir=None, extra=None):
    """Build the fleet report payload."""
    now = datetime.now().isoformat()
    latest_md = get_latest_cron_output(job_id)
    parsed = parse_report(latest_md) if latest_md else {}

    report = {
        'employee': employee,
        'job_id': job_id,
        'timestamp': now,
        'verdict': parsed.get('verdict', 'UNKNOWN'),
        'finished': parsed.get('finished', ''),
        'couldnt': parsed.get('couldnt', ''),
        'needs_you': parsed.get('needs_you', ''),
        'draft_dir': draft_dir or '',
        'extra': extra or '',
    }

    # Add file-sourced info
    if draft_dir and Path(draft_dir).exists():
        drafts = list(Path(draft_dir).glob("*.md"))
        if drafts:
            latest_draft = max(drafts, key=lambda f: f.stat().st_mtime)
            report['latest_draft'] = str(latest_draft)
            report['draft_size'] = latest_draft.stat().st_size
            report['draft_mtime'] = datetime.fromtimestamp(latest_draft.stat().st_mtime).isoformat()

    # Add process check
    gw = check_gateway()
    hm = check_hostamar()
    report['checks'] = {
        'gateway_up': gw['up'],
        'gateway_models': gw['models'],
        'hostamar_health': hm['status'],
    }

    return report

def push_report(report):
    """Push report to hostamar.com /api/admin/fleet via fleet-report-push.sh or direct HTTP."""
    # Try the shell script first
    if REPORT_SCRIPT.exists():
        try:
            result = subprocess.run(
                ['bash', str(REPORT_SCRIPT), report['job_id'], report['employee']],
                capture_output=True, text=True, timeout=30,
                env={**os.environ, 'FLEET_REPORT_SECRET': load_fleet_secret() or ''}
            )
            if result.returncode == 0:
                log(f"  pushed via fleet-report-push.sh: {result.stdout.strip()}")
                return {'pushed': True, 'method': 'shell', 'output': result.stdout.strip()}
            else:
                log(f"  shell push failed: {result.stderr.strip()}")
        except Exception as e:
            log(f"  shell push error: {e}")

    # Fallback: direct HTTP POST
    try:
        import urllib.request
        data = json.dumps(report).encode('utf-8')
        req = urllib.request.Request(
            FLEET_URL,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'X-Fleet-Secret': load_fleet_secret() or '',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode('utf-8')
            log(f"  pushed via HTTP: {resp.status} {body[:100]}")
            return {'pushed': True, 'method': 'http', 'status': resp.status, 'body': body[:200]}
    except Exception as e:
        log(f"  HTTP push failed: {e}")
        return {'pushed': False, 'method': 'http', 'error': str(e)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('job_id', help='Cron job ID')
    parser.add_argument('employee', help='Employee name')
    parser.add_argument('--draft-dir', help='Directory with draft files to report')
    parser.add_argument('--extra', help='Extra report text')
    parser.add_argument('--dry-run', action='store_true', help='Don\'t actually push')
    args = parser.parse_args()

    log(f"=== FLEET 10-MIN REPORT — {args.employee} ({args.job_id}) ===")
    report = build_report(args.job_id, args.employee, args.draft_dir, args.extra)

    # Print summary
    print(f"  verdict:   {report.get('verdict','?')}")
    print(f"  finished:  {report.get('finished','')[:100]}")
    print(f"  couldnt:   {report.get('couldnt','')[:100]}")
    print(f"  needs_you: {report.get('needs_you','')[:100]}")
    if report.get('checks'):
        print(f"  checks:    gateway_up={report['checks'].get('gateway_up')} models={report['checks'].get('gateway_models')} health={report['checks'].get('hostamar_health')}")
    if report.get('latest_draft'):
        print(f"  draft:     {report['latest_draft']} ({report.get('draft_size',0)} bytes)")

    if args.dry_run:
        log("  DRY-RUN — not pushing")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    result = push_report(report)
    if result.get('pushed'):
        log(f"  ✓ Report pushed to hostamar.com admin fleet")
    else:
        log(f"  ✗ Push failed: {result.get('error')}")

if __name__ == '__main__':
    main()
