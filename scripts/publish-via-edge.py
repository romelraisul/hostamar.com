#!/usr/bin/env python3
"""
Playwright publisher — V73
Publishes Pulse drafts to YouTube Shorts / X / Reddit using real Edge browser.

Pre-flight checks what's actually live before touching anything.
Then publishes each platform in sequence, logging to published-YYYY-MM-DD.json.

Uses real Microsoft Edge with existing login sessions (Gmail, YouTube, X, Reddit).
Edit EDGE_PATH and EDGE_PROFILE below to match your system.

Usage:
  python3 ~/hostamar-build/scripts/publish-via-edge.py [--draft-date 2026-09-11] [--dry-run] [--headless] [--no-headless]
"""

import argparse, json, os, re, sys, time
from datetime import datetime, date
from pathlib import Path

HOME = Path("/home/romel")
DRAFT_DIR = HOME / "memories" / "marketing"
PUBLISHED_LOG_DIR = HOME / "memories" / "marketing"
RENDER = HOME / "OpenMontage" / "projects" / "demos" / "renders" / "receipt-sovereign.mp4"
PAUSE_FILE = HOME / "memories" / ".pulse-pause"

# ============================================================================
# BROWSER CONFIG — edit these to match your system
# ============================================================================
EDGE_PATH = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
EDGE_PROFILE = "/mnt/c/Users/User/AppData/Local/Microsoft/Edge/User Data"
# ============================================================================

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def parse_draft(draft_path: Path):
    """Parse pulse-YYYY-MM-DD.md into 3 platform payloads."""
    raw = draft_path.read_text(encoding='utf-8')
    result = {
        'youtube': {'title': '', 'description': '', 'tags': []},
        'x': {'text': ''},
        'reddit': {'title': '', 'body': '', 'subreddit': 'VideoEditing', 'url': 'https://hostamar.com/tv'},
    }
    # --- YouTube Shorts ---
    yt_block = re.search(r'## \(a\) YouTube Shorts.*?(?=^## |\Z)', raw, re.M | re.S)
    if yt_block:
        b = yt_block.group(0)
        title_m = re.search(r'\*\*Title:\*\*\s*(.+)', b)
        desc_m = re.search(r'\*\*Description:\*\*\s*\n(.+?)(?=\n\n|\*\*|$)', b, re.S)
        if title_m: result['youtube']['title'] = title_m.group(1).strip()
        if desc_m: result['youtube']['description'] = desc_m.group(1).strip()
        tag_lines = re.findall(r'#(\S+)', b)
        result['youtube']['tags'] = [t.strip() for t in tag_lines[:15]]
    # --- X/Twitter ---
    x_block = re.search(r'## \(b\) X/Twitter Post.*?(?=^## |\Z)', raw, re.M | re.S)
    if x_block:
        b = x_block.group(0)
        lines = []
        for line in b.split('\n'):
            stripped = line.strip()
            if stripped.startswith('**') and not any(s in stripped for s in ['**Title', '**Description', '**Body']):
                continue
            if any(m in line for m in ['**Title:**', '**Description:**', '**Body:**']):
                continue
            if stripped and not stripped.startswith('#'):
                lines.append(stripped.lstrip('*').strip())
        text = ' '.join(l for l in lines if l and len(l) > 3)
        result['x']['text'] = text[:279]
    # --- Reddit ---
    reddit_block = re.search(r'## \(c\) Reddit Post.*?(?=^## |\Z)', raw, re.M | re.S)
    if reddit_block:
        b = reddit_block.group(0)
        title_m = re.search(r'\*\*Title:\*\*\s*(.+)', b)
        body_m = re.search(r'\*\*Body:\*\*\s*\n(.+?)(?=\n\n|\Z)', b, re.S)
        if title_m: result['reddit']['title'] = title_m.group(1).strip()
        if body_m: result['reddit']['body'] = body_m.group(1).strip()
    return result

def pre_flight():
    """Check what's actually live before publishing."""
    log("=== PRE-FLIGHT ===")
    checks = {}
    checks['render_exists'] = RENDER.exists()
    if checks['render_exists']:
        log(f"  render: {RENDER} ({RENDER.stat().st_size:,} bytes)")
    else:
        log(f"  render: MISSING {RENDER}")
    today = date.today().isoformat()
    draft_file = DRAFT_DIR / f"pulse-{today}.md"
    checks['draft_today'] = draft_file.exists()
    if draft_file.exists():
        log(f"  draft today: {draft_file} ({draft_file.stat().st_size:,} bytes)")
    else:
        log(f"  draft today: MISSING {draft_file}")
    checks['paused'] = PAUSE_FILE.exists()
    if checks['paused']:
        log(f"  PAUSE FILE EXISTS — publishing halted: {PAUSE_FILE}")
    else:
        log(f"  no pause file — publishing allowed")
    pub_log = PUBLISHED_LOG_DIR / f"published-{today}.json"
    if pub_log.exists():
        try:
            prev = json.loads(pub_log.read_text())
            log(f"  already published: {prev.get('status','?')} — YT={prev.get('youtube_url','?')} X={prev.get('x_url','?')} Reddit={prev.get('reddit_url','?')}")
        except Exception:
            log(f"  published log unreadable: {pub_log}")
    else:
        log(f"  no published log today — fresh start")
    return checks

def browser_launch(headless=True):
    """Launch Edge browser with real profile. Returns (browser, context, page) or (None, None, None)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log("  PLAYWRIGHT NOT INSTALLED — pip install playwright && playwright install chromium")
        return None, None, None

    if not Path(EDGE_PATH).exists():
        log(f"  Edge browser NOT FOUND at: {EDGE_PATH}")
        # Fallback to Playwright bundled chromium
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=headless)
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                log("  using Playwright bundled Chromium (no Edge)")
                return browser, context, page
        except Exception as e:
            log(f"  Chromium launch failed: {e}")
            return None, None, None

    try:
        with sync_playwright() as p:
            kwargs = {'headless': headless, 'executable_path': EDGE_PATH}
            if Path(EDGE_PROFILE).exists():
                kwargs['user_data_dir'] = EDGE_PROFILE
                log(f"  using real Edge profile: {EDGE_PROFILE}")
            browser = p.chromium.launch(**kwargs)
            context = browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            return browser, context, page
    except Exception as e:
        log(f"  Edge launch failed: {e}")
        return None, None, None

def publish_youtube(payload, dry_run=False, headless=True):
    """Publish YouTube Shorts via Edge browser."""
    log("--- YouTube Shorts ---")
    if dry_run:
        log(f"  DRY-RUN: would upload '{payload['youtube']['title']}'")
        log(f"    desc: {payload['youtube']['description'][:80]}...")
        log(f"    tags: {payload['youtube']['tags']}")
        return {'url': None, 'status': 'dry_run'}

    browser, context, page = browser_launch(headless)
    if not browser:
        return {'url': None, 'status': 'error', 'error': 'browser launch failed'}

    try:
        log("  navigating to YouTube Studio")
        page.goto('https://studio.youtube.com/', timeout=20000)
        page.wait_for_timeout(2000)

        if 'accounts.google.com' in page.url or 'signin' in page.url.lower():
            log("  NOT LOGGED IN to YouTube — please log in manually then re-run")
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'not logged in to YouTube'}

        log("  LOGGED IN — proceeding to upload")
        page.goto('https://studio.youtube.com/channel/movies/uploads', timeout=20000)
        page.wait_for_timeout(2000)

        # Click Create
        for sel in ['button:has-text("Create")', 'button[aria-label*="Create"]']:
            try:
                page.click(sel, timeout=5000)
                log(f"  clicked Create via: {sel}")
                break
            except:
                continue
        else:
            log("  Create button not found — trying direct")
            page.goto('https://studio.youtube.com/channel/movies/uploads?', timeout=10000)

        page.wait_for_timeout(2000)

        # Upload file
        for sel in ['input[type="file"]', 'input[type="file"][accept*="video"]']:
            try:
                page.wait_for_selector(sel, timeout=10000)
                page.set_input_files(sel, str(RENDER))
                log(f"  file selected: {RENDER.name}")
                break
            except:
                continue
        else:
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'file input not found'}

        page.wait_for_timeout(8000)

        # Fill title
        try:
            page.locator('input[name="title"]').fill(payload['youtube']['title'])
            log(f"  title: {payload['youtube']['title']}")
        except Exception as e:
            log(f"  title error: {e}")

        # Fill description
        try:
            desc = page.locator('textarea[name="description"]')
            if desc.count() > 0:
                desc.fill(payload['youtube']['description'])
                log(f"  description filled ({len(payload['youtube']['description'])} chars)")
        except Exception as e:
            log(f"  desc error: {e}")

        # Fill tags
        for tag in payload['youtube']['tags'][:15]:
            try:
                ti = page.locator('input[name="tags"]')
                if ti.count() > 0:
                    ti.fill(tag + '\t')
                    page.wait_for_timeout(300)
            except:
                pass

        page.wait_for_timeout(2000)

        # Set Public
        try:
            if page.locator('text=Public').count() > 0:
                page.locator('text=Public').first.click()
            else:
                page.click('button[aria-label*="Visibility"]')
                page.wait_for_timeout(1000)
                page.click('text=Public')
            log("  visibility: Public")
        except Exception as e:
            log(f"  visibility error: {e}")

        page.wait_for_timeout(3000)

        # Publish
        for sel in ['button:has-text("Publish")', 'button[aria-label*="Publish"]']:
            try:
                page.click(sel, timeout=5000)
                log(f"  clicked Publish via: {sel}")
                break
            except:
                continue

        page.wait_for_timeout(10000)

        # Get URL
        url = page.url
        video_id = None
        if 'watch?v=' in url:
            video_id = url.split('watch?v=')[-1].split('&')[0]
        elif '/shorts/' in url:
            video_id = url.split('/shorts/')[-1].split('/')[0]

        browser.close()

        if video_id:
            final_url = f"https://www.youtube.com/watch?v={video_id}"
        else:
            final_url = url

        log(f"  PUBLISHED: {final_url}")
        return {'url': final_url, 'status': 'published'}

    except Exception as e:
        log(f"  ERROR: {e}")
        import traceback; traceback.print_exc()
        try: browser.close()
        except: pass
        return {'url': None, 'status': 'error', 'error': str(e)}

def publish_x(payload, dry_run=False, headless=True):
    """Publish X/Twitter post via Edge browser."""
    log("--- X/Twitter Post ---")
    if dry_run:
        log(f"  DRY-RUN: would post '{payload['x']['text'][:80]}...'")
        return {'url': None, 'status': 'dry_run'}

    browser, context, page = browser_launch(headless)
    if not browser:
        return {'url': None, 'status': 'error', 'error': 'browser launch failed'}

    try:
        log("  navigating to x.com")
        page.goto('https://x.com/', timeout=20000)
        page.wait_for_timeout(2000)

        if 'login' in page.url.lower() or 'signin' in page.url.lower():
            log("  NOT LOGGED IN to X")
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'not logged in to X'}

        log("  LOGGED IN — composing tweet")

        # Click compose
        for sel in ['button[aria-label*="Post"]', 'button[aria-label*="Tweet"]', 'div[role="button"]:has-text("Post")', 'button[data-testid="SidebarComposeButton"]']:
            try:
                page.click(sel, timeout=3000)
                log(f"  compose clicked: {sel}")
                break
            except:
                continue
        else:
            try:
                page.keyboard.press('n')
                page.wait_for_timeout(1000)
                log("  compose via keyboard 'n'")
            except:
                browser.close()
                return {'url': None, 'status': 'error', 'error': 'compose not found'}

        page.wait_for_timeout(1000)

        # Type text
        text = payload['x']['text']
        for sel in ['div[role="textbox"]', 'textarea[name="text"]', 'div[contenteditable="true"]']:
            try:
                el = page.locator(sel)
                if el.count() > 0:
                    el.fill(text)
                    log(f"  typed {len(text)} chars via: {sel}")
                    break
            except:
                continue
        else:
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'text input not found'}

        page.wait_for_timeout(2000)

        # Post
        for sel in ['button[aria-label*="Post"]', 'button[data-testid="TweetButton"]', 'div[role="button"]:has-text("Post")']:
            try:
                page.click(sel, timeout=3000)
                log(f"  post clicked: {sel}")
                break
            except:
                continue
        else:
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'post button not found'}

        page.wait_for_timeout(8000)

        tweet_url = page.url
        tweet_id = None
        if 'status/' in tweet_url:
            tweet_id = tweet_url.split('status/')[-1].split('/')[0]
        elif '/i/web/status/' in tweet_url:
            tweet_id = tweet_url.split('/i/web/status/')[-1].split('/')[0]

        browser.close()

        final_url = f"https://x.com/i/web/status/{tweet_id}" if tweet_id else tweet_url
        log(f"  PUBLISHED: {final_url}")
        return {'url': final_url, 'status': 'published'}

    except Exception as e:
        log(f"  ERROR: {e}")
        import traceback; traceback.print_exc()
        try: browser.close()
        except: pass
        return {'url': None, 'status': 'error', 'error': str(e)}

def publish_reddit(payload, dry_run=False, headless=True):
    """Publish Reddit post via Edge browser."""
    log("--- Reddit Post ---")
    if dry_run:
        log(f"  DRY-RUN: would post to r/{payload['reddit']['subreddit']} — '{payload['reddit']['title']}'")
        return {'url': None, 'status': 'dry_run'}

    browser, context, page = browser_launch(headless)
    if not browser:
        return {'url': None, 'status': 'error', 'error': 'browser launch failed'}

    try:
        log("  navigating to reddit.com")
        page.goto('https://reddit.com/', timeout=20000)
        page.wait_for_timeout(2000)

        if 'login' in page.url.lower() or 'signin' in page.url.lower():
            log("  NOT LOGGED IN to Reddit")
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'not logged in to Reddit'}

        log("  LOGGED IN — posting to r/VideoEditing")
        subreddit = payload['reddit']['subreddit']
        page.goto(f'https://reddit.com/r/{subreddit}/submit', timeout=20000)
        page.wait_for_timeout(3000)

        # Title
        try:
            page.locator('input[name="title"]').fill(payload['reddit']['title'])
            log(f"  title filled")
        except Exception as e:
            log(f"  title error: {e}")

        page.wait_for_timeout(1000)

        # Body
        body_text = payload['reddit']['body']
        body_done = False
        for sel in ['textarea[name="text"]', 'div[role="textbox"]', 'textarea[placeholder*="text"]']:
            try:
                el = page.locator(sel)
                if el.count() > 0:
                    el.fill(body_text)
                    body_done = True
                    log(f"  body filled via: {sel}")
                    break
            except:
                continue

        if not body_done:
            try:
                page.click('text=Text')
                page.wait_for_timeout(500)
                page.locator('textarea').fill(body_text)
                body_done = True
                log("  body filled via Text tab")
            except:
                log("  WARNING: body not filled")

        page.wait_for_timeout(1000)

        # URL
        if payload['reddit']['url']:
            try:
                page.locator('input[name="url"]').fill(payload['reddit']['url'])
            except:
                pass

        page.wait_for_timeout(1000)

        # Submit
        for sel in ['button[type="submit"]', 'button:has-text("Submit")', 'button:has-text("post")', 'div[role="button"]:has-text("Submit")']:
            try:
                page.click(sel, timeout=3000)
                log(f"  submit clicked: {sel}")
                break
            except:
                continue
        else:
            browser.close()
            return {'url': None, 'status': 'error', 'error': 'submit not found'}

        page.wait_for_timeout(8000)

        post_url = page.url
        post_id = None
        if 'reddit.com/comments/' in post_url:
            post_id = post_url.split('reddit.com/comments/')[-1].split('/')[0]

        browser.close()

        final_url = f"https://reddit.com/comments/{post_id}" if post_id else post_url
        log(f"  PUBLISHED: {final_url}")
        return {'url': final_url, 'status': 'published'}

    except Exception as e:
        log(f"  ERROR: {e}")
        import traceback; traceback.print_exc()
        try: browser.close()
        except: pass
        return {'url': None, 'status': 'error', 'error': str(e)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--draft-date', default=None, help='Draft date YYYY-MM-DD (default: today)')
    parser.add_argument('--dry-run', action='store_true', help='Don\'t actually publish — simulate only')
    parser.add_argument('--headless', action='store_true', default=True, help='Run browser headless (default)')
    parser.add_argument('--no-headless', action='store_true', help='Show browser window (debugging)')
    args = parser.parse_args()

    headless = False if args.no_headless else args.headless

    today = args.draft_date or date.today().isoformat()
    draft_file = DRAFT_DIR / f"pulse-{today}.md"
    pub_log = PUBLISHED_LOG_DIR / f"published-{today}.json"

    log(f"=== AUTO-PUBLISH V73 — {today} ===")
    log(f"  draft: {draft_file}")
    log(f"  log:   {pub_log}")
    log(f"  headless: {headless}")
    log(f"  Edge:  {EDGE_PATH}")
    log(f"  Profile: {EDGE_PROFILE}")

    checks = pre_flight()
    if checks['paused']:
        log("  HALTED — pause file present.")
        pub_log.write_text(json.dumps({'status': 'paused', 'timestamp': datetime.now().isoformat()}, indent=2))
        sys.exit(0)

    if not draft_file.exists():
        log(f"  NO DRAFT for {today}")
        pub_log.write_text(json.dumps({'status': 'couldnt', 'missing': [str(draft_file)], 'timestamp': datetime.now().isoformat()}, indent=2))
        sys.exit(0)

    payload = parse_draft(draft_file)
    log(f"  parsed: YT={bool(payload['youtube']['title'])} X={bool(payload['x']['text'])} Reddit={bool(payload['reddit']['title'])}")
    if payload['youtube']['tags']:
        log(f"  tags ({len(payload['youtube']['tags'])}): {', '.join(payload['youtube']['tags'][:5])}...")

    # Publish each platform
    results = {}
    for platform, func in [('youtube', publish_youtube), ('x', publish_x), ('reddit', publish_reddit)]:
        log(f"--- Publishing {platform} ---")
        result = func(payload, args.dry_run, headless)
        results[platform] = result
        log(f"  result: {result.get('status','?')} url={result.get('url','?')}")
        time.sleep(2)

    # Final log
    yt_url = results['youtube'].get('url')
    x_url = results['x'].get('url')
    reddit_url = results['reddit'].get('url')
    statuses = [results[p].get('status') for p in ['youtube', 'x', 'reddit']]
    published_count = sum(1 for s in statuses if s == 'published')
    missing = [f"{p}: {r.get('error', r.get('status'))}" for p, r in results.items() if r.get('status') != 'published']

    if published_count == 3: status = 'published'
    elif published_count > 0: status = 'partial'
    else: status = 'couldnt'

    final = {
        'draft_date': today,
        'draft_file': str(draft_file),
        'render_file': str(RENDER),
        'status': status,
        'published_count': published_count,
        'youtube_url': yt_url,
        'x_url': x_url,
        'reddit_url': reddit_url,
        'missing': missing,
        'timestamp': datetime.now().isoformat(),
    }
    pub_log.write_text(json.dumps(final, indent=2))
    log(f"=== DONE — status={status} published={published_count}/3 ===")
    log(f"  log: {pub_log}")
    if yt_url: log(f"  YouTube: {yt_url}")
    if x_url: log(f"  X: {x_url}")
    if reddit_url: log(f"  Reddit: {reddit_url}")

if __name__ == '__main__':
    main()
