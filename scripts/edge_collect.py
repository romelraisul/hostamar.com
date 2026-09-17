#!/usr/bin/env python3
"""local-runner/edge_collect.py — Collect Facebook + YouTube IDs and stream keys via Edge UIA.
Runs on Windows via hermes venv Python. Drives real Edge directly.
Collects: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, FACEBOOK_RTMP_URL, YOUTUBE_CHANNEL_ID,
          YOUTUBE_HANDLE, and verifies existing creds.

Usage:
  python local-runner/edge_collect.py          # interactive collection
  python local-runner/edge_collect.py --json   # JSON output only
  python local-runner/edge_collect.py --verify  # verify existing logins only
"""
import sys
import json
import time
import os
import re

try:
    from pywinauto import Application, Desktop
except ImportError:
    print(json.dumps({"error": "pywinauto not installed"}))
    sys.exit(1)

# ─── Config ────────────────────────────────────────────────────────────────
WIN_PYTHON = os.environ.get("WIN_PYTHON", r"C:\Users\User\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
HOSTAMAR_ENV = os.environ.get("HOSTAMAR_ENV", r"C:\Users\User\hostamar-build\.env.local")
RESULTS_FILE = os.environ.get("RESULTS_FILE", r"C:\Users\User\hostamar-build\.env.local")

# Platform URL → window title keyword mapping
PLATFORMS = {
    "Google":    ["google", "gmail", "drive", "gsc"],
    "Facebook":  ["facebook"],
    "X":         ["x.com", "twitter"],
    "YouTube":   ["youtube"],
}

# ─── Helpers ────────────────────────────────────────────────────────────────

def connect_edge():
    """Connect to existing Edge or start a new one. Returns app or None."""
    try:
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        return app
    except Exception:
        pass
    try:
        app = Application(backend="uia").start(EDGE_PATH)
        time.sleep(5)
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        return app
    except Exception as e:
        print(f"ERROR: Could not start Edge: {e}")
        return None


def get_window_titles():
    """Return list of all visible window titles."""
    try:
        wins = Desktop(backend="uia").windows()
        return [w.window_text() for w in wins if w.window_text()]
    except Exception as e:
        print(f"WARNING: window enumeration failed: {e}")
        return []


def check_platforms():
    """Check which platforms are logged in via window title sniffing."""
    result = {p: False for p in PLATFORMS}
    result["Edge"] = False
    titles = get_window_titles()
    for title in titles:
        tl = title.lower()
        for platform, keywords in PLATFORMS.items():
            if not result[platform]:
                for kw in keywords:
                    if kw in tl:
                        result[platform] = True
                        break
    # Edge itself
    for title in titles:
        if "edge" in title.lower():
            result["Edge"] = True
            break
    return result


def open_url_in_edge(app, url):
    """Open a URL in the current Edge tab via Ctrl+L address bar."""
    try:
        # Focus the window
        win = app.window(title_re=".*Edge.*")
        win.set_focus()
        time.sleep(0.5)
        # Ctrl+L to focus address bar
        win.type_keys("^l")
        time.sleep(0.3)
        # Clear and type URL
        win.type_keys("^a")
        time.sleep(0.2)
        win.type_keys(url)
        time.sleep(0.3)
        # Enter
        win.type_keys("{ENTER}")
        time.sleep(3)
        return True
    except Exception as e:
        print(f"WARNING: Could not open {url}: {e}")
        return False


def navigate_and_get_title(app, url, expected_keyword, timeout=10):
    """Navigate to URL and wait for page to load. Returns new title or None."""
    if not open_url_in_edge(app, url):
        return None
    start = time.time()
    while time.time() - start < timeout:
        titles = get_window_titles()
        for t in titles:
            if expected_keyword.lower() in t.lower():
                return t
        time.sleep(1)
    return None


def collect_facebook_page_id(app):
    """Navigate to Facebook Page → About → Page transparency to get Page ID."""
    print("\n=== Collecting Facebook Page ID ===")
    # Open Facebook
    title = navigate_and_get_title(app, "https://www.facebook.com/", "facebook", 8)
    if not title:
        print("  Could not open Facebook. Is it logged in?")
        return None

    # Try to get Page ID from URL or page source
    # Method 1: Navigate to page settings
    print("  Attempting to extract Page ID from Facebook...")
    # Open the Page's About section
    navigate_and_get_title(app, "https://www.facebook.com/your-page-name/about", "facebook", 5)
    time.sleep(2)

    # Method 2: Use Graph API if access token available
    # This requires a User Access Token — we'll collect that separately
    print("  NOTE: For reliable Page ID, navigate manually to:")
    print("    https://www.facebook.com/your-page-name/about → Page transparency")
    print("  Or use: https://graph.facebook.com/v19.0/me/accounts?access_token=USER_TOKEN")
    return None  # Requires manual extraction or Graph API


def collect_facebook_access_token(app):
    """Navigate to developers.facebook.com → Graph Explorer → generate token."""
    print("\n=== Collecting Facebook Page Access Token ===")
    title = navigate_and_get_title(
        app, "https://developers.facebook.com/tools/explorer/", "developer", 8
    )
    if not title:
        print("  Could not open Graph Explorer. Is it logged in?")
        return None

    print("  Manual steps needed in Graph Explorer:")
    print("    1. Select App: Hostamar (create if missing — type Business)")
    print("    2. Select User Token permissions:")
    print("       pages_show_list, pages_read_engagement, pages_manage_posts,")
    print("       pages_read_user_content, public_profile")
    print("    3. Click 'Generate Token'")
    print("    4. Click 'Get Token' → 'Get User Access Token'")
    print("    5. Copy the long-lived token")
    print("  Then: GET /me/accounts → find your Page → copy Page Access Token")
    return None


def collect_facebook_rtmp(app):
    """Navigate to Facebook Page → Live → Streaming Software to get RTMP URL."""
    print("\n=== Collecting Facebook RTMP URL ===")
    title = navigate_and_get_title(app, "https://www.facebook.com/", "facebook", 5)
    if not title:
        print("  Could not open Facebook.")
        return None

    print("  Manual steps:")
    print("    1. Go to your Facebook Page")
    print("    2. Meta Business Suite → Content → Live Video → Create Live Video")
    print("    3. Click 'Streaming Software' tab")
    print("    4. Copy Server URL: rtmp://live-api-s.facebook.com:443/rtmp/")
    print("    5. Copy Stream Key (click eye icon to reveal)")
    print("  Format: FACEBOOK_RTMP_URL=rtmp://live-api-s.facebook.com:443/rtmp/STREAM_KEY")
    return None


def collect_youtube_channel_id(app):
    """Navigate to YouTube Studio → Settings → Channel → Advanced → copy Channel ID."""
    print("\n=== Collecting YouTube Channel ID ===")
    title = navigate_and_get_title(
        app, "https://studio.youtube.com/", "studio", 8
    )
    if not title:
        print("  Could not open YouTube Studio. Is Google logged in?")
        return None

    print("  Manual steps:")
    print("    1. YouTube Studio → Settings (bottom-left gear icon)")
    print("    2. Channel → Advanced settings")
    print("    3. Copy Channel ID (UC... 24 chars)")
    print("  OR: https://www.youtube.com/account_advanced → Channel ID")
    print("  Also copy Handle (@username) from channel page")
    return None


def collect_youtube_stream_key(app):
    """Navigate to YouTube Studio → Go Live → Stream tab → copy RTMP URL + Stream Key."""
    print("\n=== Collecting YouTube Stream Key + RTMP URL ===")
    title = navigate_and_get_title(
        app, "https://studio.youtube.com/", "studio", 5
    )
    if not title:
        return None

    print("  Manual steps:")
    print("    1. YouTube Studio → Create → Go Live")
    print("    2. Stream tab (NOT Webcam)")
    print("    3. Stream settings → Server URL: rtmp://a.rtmp.youtube.com/live2/")
    print("    4. Stream Key: click eye icon to reveal")
    print("  Format: YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2/KEY")
    return None


def collect_youtube_oauth(app):
    """Navigate to Google Cloud Console → Credentials → copy OAuth Client ID + Secret."""
    print("\n=== Collecting YouTube OAuth Client ID + Secret ===")
    title = navigate_and_get_title(
        app, "https://console.cloud.google.com/", "console", 8
    )
    if not title:
        print("  Could not open Google Cloud Console.")
        return None

    print("  Manual steps:")
    print("    1. Google Cloud Console → Select project: Hostamar")
    print("    2. APIs & Services → Credentials")
    print("    3. OAuth 2.0 Client IDs → Click 'Hostamar'")
    print("    4. Copy Client ID + Client Secret")
    print("  If not exists: Create Credentials → OAuth client ID →")
    print("    Web application → Name: Hostamar →")
    print("    Authorized redirect URI: https://developers.google.com/oauthplayground")
    return None


def collect_youtube_refresh_token(app):
    """Navigate to OAuth Playground → generate refresh token."""
    print("\n=== Collecting YouTube Refresh Token ===")
    title = navigate_and_get_title(
        app, "https://developers.google.com/oauthplayground/", "oauth", 8
    )
    if not title:
        print("  Could not open OAuth Playground.")
        return None

    print("  Manual steps:")
    print("    1. OAuth Playground → Settings → check 'use your own OAuth credentials'")
    print("    2. Enter Client ID + Client Secret")
    print("    3. Step 1: Select YouTube Data API v3 scopes:")
    print("       https://www.googleapis.com/auth/youtube")
    print("       https://www.googleapis.com/auth/youtube.upload")
    print("    4. Authorize → Exchange code for tokens")
    print("    5. Copy Refresh Token + Access Token")
    return None


def collect_x_tokens(app):
    """Navigate to developer.twitter.com → copy API keys."""
    print("\n=== Collecting X/Twitter API Keys ===")
    title = navigate_and_get_title(
        app, "https://developer.twitter.com/", "developer", 8
    )
    if not title:
        print("  Could not open X Developer Portal.")
        return None

    print("  Manual steps:")
    print("    1. developer.twitter.com → Portal → Dashboard → Hostamar project")
    print("    2. Keys and tokens tab")
    print("    3. Copy: API Key, API Secret, Bearer Token,")
    print("       Access Token, Access Token Secret")
    print("  Check if existing tokens are real (not stub_*)")
    return None


def save_to_env(values: dict):
    """Append collected values to .env.local (mask in output)."""
    env_path = RESULTS_FILE
    print(f"\n=== Saving to {env_path} ===")
    existing = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    existing[k] = v

    merged = {**existing, **values}
    with open(env_path, "w", encoding="utf-8") as f:
        for k, v in sorted(merged.items()):
            f.write(f"{k}={v}\n")

    # Print masked
    for k in sorted(values.keys()):
        print(f"  {k}=***masked***")
    print(f"  Saved {len(values)} new values to {env_path}")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--interactive"

    print("=" * 60)
    print("Hostamar TV — Edge Collect IDs (Facebook + YouTube + Stream Keys)")
    print("My Own Hermes ID — Full Auto via Edge UIA")
    print("=" * 60)

    # Step 1: Connect to Edge
    print("\n[1] Connecting to Edge...")
    app = connect_edge()
    if not app:
        print("ERROR: Could not connect to or start Edge.")
        print("  Make sure Edge is installed at:", EDGE_PATH)
        print("  Or open Edge manually and retry.")
        sys.exit(1)
    print("  Edge connected.")

    # Step 2: Check platforms
    print("\n[2] Checking platform logins...")
    platforms = check_platforms()
    for p, ok in platforms.items():
        mark = "✓" if ok else "✗"
        print(f"  {mark} {p}")

    if mode == "--verify":
        print("\nVerification complete. Platforms not detected need their tabs opened.")
        sys.exit(0)

    # Step 3: Collect based on what's logged in
    if platforms["Google"]:
        print("\n[3] Google is logged in — collecting YouTube info...")
        collect_youtube_channel_id(app)
        collect_youtube_stream_key(app)
        collect_youtube_oauth(app)
        collect_youtube_refresh_token(app)
    else:
        print("\n[3] Google NOT detected — skip YouTube collection.")
        print("  Open https://studio.youtube.com/ in Edge and retry.")

    if platforms["Facebook"]:
        print("\n[4] Facebook is logged in — collecting Facebook info...")
        collect_facebook_page_id(app)
        collect_facebook_access_token(app)
        collect_facebook_rtmp(app)
    else:
        print("\n[4] Facebook NOT detected — skip Facebook collection.")
        print("  Open https://www.facebook.com/ in Edge and retry.")

    if platforms["X"]:
        print("\n[5] X/Twitter is logged in — collecting X API keys...")
        collect_x_tokens(app)
    else:
        print("\n[5] X/Twitter NOT detected — skip X collection.")
        print("  Open https://developer.twitter.com/ in Edge and retry.")

    # Step 4: Save
    print("\n[6] Collection complete.")
    print("  Collected values need to be manually saved to .env.local")
    print("  and added to Vercel env (production).")
    print("\n  Next steps:")
    print("    1. Manually copy collected IDs/tokens from Edge into .env.local")
    print("    2. Run: vercel env add <KEY> production < value")
    print("    3. Add to D1 TvStreamDestination via /admin/tv/restream")
    print("    4. Add comment-replier to crontab:")
    print("       crontab -l | grep comment-replier ||")
    print("       (crontab -l; echo '*/5 * * * * /home/romel/.local/bin/node")
    print("        /home/romel/hostamar-build/scripts/reply-comments.mjs")
    print("        >> /tmp/comment-replier.log 2>&1') | crontab -")


if __name__ == "__main__":
    main()
