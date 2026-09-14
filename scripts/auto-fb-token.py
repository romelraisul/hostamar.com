#!/usr/bin/env python3
"""scripts/auto-fb-token.py — Automate Facebook Page Access Token creation via pywinauto UIA."""
import sys, io, time, json, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pywinauto import Application, Desktop, keyboard

def connect_edge():
    app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
    print("[OK] Connected to Edge")
    return app

def find_window(title_re, timeout=10):
    for _ in range(timeout * 2):
        wins = Desktop(backend="uia").windows()
        for w in wins:
            if title_re.lower() in w.window_text().lower():
                return w
        time.sleep(0.5)
    return None

def click_button(parent, text_pattern):
    """Click a button matching text_pattern."""
    try:
        buttons = parent.descendants(control_type="Button")
        for b in buttons:
            if text_pattern.lower() in b.window_text().lower():
                b.click()
                print(f"  Clicked: {b.window_text()[:60]}")
                return True
    except Exception as e:
        print(f"  Button click error: {e}")
    return False

def type_in_field(parent, text):
    """Type text into the first edit field."""
    try:
        edits = parent.descendants(control_type="Edit")
        if edits:
            edits[0].set_text(text)
            print(f"  Typed in field")
            return True
    except Exception as e:
        print(f"  Type error: {e}")
    return False

def select_from_dropdown(parent, text):
    """Select from dropdown."""
    try:
        combos = parent.descendants(control_type="ComboBox")
        for c in combos:
            if text.lower() in c.window_text().lower():
                c.select(text)
                print(f"  Selected: {text}")
                return True
    except:
        pass
    return False

def main():
    print("=== Facebook Page Access Token Automation ===\n")
    app = connect_edge()
    edge = app.window(title_re=".*Edge.*")

    # Step 1: Navigate to Graph API Explorer
    print("[1] Navigating to Graph API Explorer...")
    edge.type_keys("^t")
    time.sleep(0.5)
    edge.type_keys("https://developers.facebook.com/tools/explorer/{ENTER}")
    time.sleep(5)

    # Step 2: Check if logged in and find the app selector
    print("[2] Checking page state...")
    wins = Desktop(backend="uia").windows()
    page_text = ""
    for w in wins:
        t = w.window_text()
        if "Graph API" in t or "Explorer" in t or "developers.facebook" in t.lower():
            page_text = t
            print(f"  Page: {t[:100]}")

    # Step 3: Look for "Get User Access Token" or similar
    print("[3] Looking for token generation...")
    time.sleep(2)

    # Try to find and click "Get Token" dropdown
    fb_window = find_window("Graph API", timeout=5) or find_window("Explorer", timeout=5)
    if fb_window:
        print("[4] Found Facebook window, looking for controls...")

        # Try to click "Get Token" button
        if click_button(fb_window, "Get Token"):
            time.sleep(1)
            # Look for "Page Access Token" option
            click_button(fb_window, "Page Access Token")
            time.sleep(2)

        # Look for permissions
        print("[5] Looking for permissions...")
        for perm in ["pages_manage_posts", "pages_read_engagement"]:
            click_button(fb_window, perm)
            time.sleep(0.5)

        # Generate token
        print("[6] Generating token...")
        click_button(fb_window, "Generate")
        click_button(fb_window, "Submit")
        click_button(fb_window, "Continue")
        time.sleep(3)

    # Step 7: Try to extract token from page
    print("[7] Extracting token...")
    wins = Desktop(backend="uia").windows()
    token = None
    for w in wins:
        t = w.window_text()
        # Look for EA... pattern (Facebook access tokens)
        matches = re.findall(r'EA[a-zA-Z0-9]+', t)
        if matches:
            token = matches[0]
            print(f"  Found token: {token[:20]}...")
            break

    if not token:
        # Try to find token in text fields
        print("[8] Trying to find token in text fields...")
        for w in wins:
            try:
                edits = w.descendants(control_type="Edit")
                for e in edits:
                    val = e.window_text()
                    if val.startswith("EA") and len(val) > 50:
                        token = val
                        print(f"  Found token in field: {token[:20]}...")
                        break
            except:
                pass

    if token:
        print(f"\n=== TOKEN FOUND ===")
        print(f"Token: {token}")
        with open("/tmp/facebook_page_token.txt", "w") as f:
            f.write(token)
        print("Saved to /tmp/facebook_page_token.txt")
    else:
        print("\n=== TOKEN NOT FOUND ===")
        print("Please manually copy the token from the browser.")
        print("The Graph API Explorer tab is open in Edge.")

    return token

if __name__ == "__main__":
    main()
