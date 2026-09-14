#!/usr/bin/env python3
"""scripts/create-tokens.py — Create Facebook Page Access Token + Google Service Account JSON via pywinauto UIA."""
import sys, io, time, json, os, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pywinauto import Application, Desktop

DOWNLOADS = os.path.expanduser("~/Downloads")
FB_TOKEN_FILE = "/tmp/facebook_page_token.txt"
GA_JSON_FILE = "/tmp/google_service_account.json"

def connect_edge():
    try:
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        print("[OK] Connected to Edge")
        return app
    except Exception as e:
        print(f"[FAIL] Edge connect: {e}")
        sys.exit(1)

def open_tab(edge, url):
    edge.type_keys("^t")
    time.sleep(0.5)
    edge.type_keys(url + "{ENTER}")
    time.sleep(3)

def wait_for_title(app, keyword, timeout=15):
    for _ in range(timeout * 2):
        wins = Desktop(backend="uia").windows()
        for w in wins:
            t = w.window_text()
            if keyword.lower() in t.lower():
                return w
        time.sleep(0.5)
    return None

def create_facebook_token(app):
    print("\n=== FACEBOOK PAGE ACCESS TOKEN ===")
    edge = app.window(title_re=".*Edge.*")

    # Open Graph API Explorer
    print("[1] Opening Facebook Graph API Explorer...")
    open_tab(edge, "https://developers.facebook.com/tools/explorer/")
    time.sleep(5)

    # Check if logged in
    wins = Desktop(backend="uia").windows()
    titles = [w.window_text() for w in wins if w.window_text()]

    # Look for login form or Graph API Explorer
    logged_in = any("Graph API" in t or "Explorer" in t for t in titles)
    if not logged_in:
        # Check for login button
        login_win = wait_for_title(app, "Log In", timeout=5)
        if login_win:
            print("[!] Facebook not logged in — logging in via browser cookie...")
            # Try to find and click continue button
            try:
                btns = login_win.children()
                for b in btns:
                    if "continue" in b.window_text().lower() or "log in" in b.window_text().lower():
                        b.click()
                        time.sleep(3)
                        break
            except:
                pass

    # Look for "Get Token" button
    print("[2] Looking for Get Token button...")
    time.sleep(2)

    # Try to find the token generation area
    wins = Desktop(backend="uia").windows()
    for w in wins:
        title = w.window_text()
        if "access token" in title.lower() or "generate" in title.lower():
            print(f"  Found: {title[:80]}")

    # Alternative: use direct URL for token generation
    print("[3] Opening direct token generation page...")
    open_tab(edge, "https://developers.facebook.com/tools/accesstoken/")
    time.sleep(5)

    # Look for Page Token section
    wins = Desktop(backend="uia").windows()
    for w in wins:
        title = w.window_text()
        if "page" in title.lower() and "token" in title.lower():
            print(f"  Found page token: {title[:80]}")

    # Try to extract token from page using JavaScript
    print("[4] Attempting to extract token via page interaction...")
    edge.type_keys("^u")  # View source
    time.sleep(2)
    edge.type_keys("^a")  # Select all
    time.sleep(0.5)
    edge.type_keys("^c")  # Copy
    time.sleep(0.5)
    edge.type_keys("^w")  # Close tab
    time.sleep(1)

    print("[5] Facebook token page opened — manual extraction may be needed")
    return None

def create_google_service_account(app):
    print("\n=== GOOGLE SERVICE ACCOUNT ===")
    edge = app.window(title_re=".*Edge.*")

    # Open Google Cloud Console Service Accounts
    print("[1] Opening Google Cloud Console Service Accounts...")
    open_tab(edge, "https://console.cloud.google.com/iam-admin/serviceaccounts")
    time.sleep(5)

    # Check if on service accounts page
    wins = Desktop(backend="uia").windows()
    on_page = any("Service Account" in w.window_text() for w in wins)
    if not on_page:
        print("[!] Not on Service Accounts page, trying again...")
        open_tab(edge, "https://console.cloud.google.com/iam-admin/serviceaccounts?hostamar-build")
        time.sleep(5)

    # Look for CREATE SERVICE ACCOUNT button
    print("[2] Looking for CREATE SERVICE ACCOUNT button...")
    wins = Desktop(backend="uia").windows()
    for w in wins:
        title = w.window_text()
        if "create" in title.lower() and "service" in title.lower():
            print(f"  Found: {title[:80]}")

    print("[3] Google Cloud Console opened on Service Accounts page")
    return None

def main():
    print("=== Token Creation Script ===")
    print("Using pywinauto UIA to drive Edge browser")
    print()

    app = connect_edge()

    # Create Facebook token
    fb_token = create_facebook_token(app)

    # Create Google Service Account
    ga_json = create_google_service_account(app)

    print("\n=== Summary ===")
    print("Tabs opened in Edge browser.")
    print("Please complete the token creation manually in the browser.")
    print("\nFacebook: https://developers.facebook.com/tools/explorer/")
    print("  1. Select your app")
    print("  2. Click 'Get Token' → 'Page Access Token'")
    print("  3. Select permissions: pages_manage_posts, pages_read_engagement")
    print("  4. Copy token")
    print("\nGoogle: https://console.cloud.google.com/iam-admin/serviceaccounts")
    print("  1. CREATE SERVICE ACCOUNT → name: hostamar-gsc")
    print("  2. Grant: Site Verification Owner, Search Console Owner")
    print("  3. Create Key → JSON → download")
    print("\nThen run: vercel env add FACEBOOK_PAGE_ACCESS_TOKEN production")
    print("           vercel env add FB_PAGE_ID production")
    print("           vercel env add GOOGLE_SERVICE_ACCOUNT_JSON production")

if __name__ == "__main__":
    main()
