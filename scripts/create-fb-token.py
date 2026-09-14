#!/usr/bin/env python3
"""scripts/create-fb-token.py — Create Facebook Page Access Token via Edge automation."""
import sys, io, time, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pywinauto import Application, Desktop, keyboard

def connect_edge():
    """Connect to running Edge instance."""
    for attempt in range(3):
        try:
            app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=10)
            print(f"[OK] Connected to Edge (attempt {attempt+1})")
            return app
        except:
            time.sleep(2)
    raise Exception("Could not connect to Edge")

def get_edge_window(app):
    """Get the main Edge window."""
    return app.window(title_re=".*Edge.*")

def navigate(edge, url):
    """Navigate to URL in new tab."""
    edge.type_keys("^t")
    time.sleep(0.3)
    keyboard.send_keys(url)
    time.sleep(0.2)
    keyboard.send_keys("{ENTER}")
    time.sleep(3)

def find_control(parent, control_type, name=None, automation_id=None):
    """Find a control by type and optional name."""
    try:
        controls = parent.descendants(control_type=control_type)
        for c in controls:
            if name and name.lower() in c.window_text().lower():
                return c
            if automation_id and automation_id in c.automation_id():
                return c
        return controls[0] if controls else None
    except:
        return None

def click_by_text(parent, text, partial=True):
    """Click a control by text."""
    try:
        controls = parent.descendants()
        for c in controls:
            ct = c.window_text()
            if (partial and text.lower() in ct.lower()) or (not partial and text.lower() == ct.lower()):
                c.click()
                print(f"  Clicked: {ct[:60]}")
                return True
    except Exception as e:
        print(f"  Click error: {e}")
    return False

def get_all_text(parent):
    """Get all text from a window."""
    texts = []
    try:
        controls = parent.descendants()
        for c in controls:
            t = c.window_text()
            if t and len(t) > 2:
                texts.append(t)
    except:
        pass
    return texts

def create_facebook_token():
    """Create Facebook Page Access Token."""
    print("\n" + "="*60)
    print("FACEBOOK PAGE ACCESS TOKEN CREATION")
    print("="*60 + "\n")
    
    app = connect_edge()
    edge = get_edge_window(app)
    
    # Step 1: Navigate to Graph API Explorer
    print("[1] Opening Facebook Graph API Explorer...")
    navigate(edge, "https://developers.facebook.com/tools/explorer/")
    time.sleep(5)
    
    # Step 2: Check page state
    print("[2] Checking page state...")
    wins = Desktop(backend="uia").windows()
    fb_win = None
    for w in wins:
        t = w.window_text()
        if "Graph API" in t or "developers.facebook" in t.lower():
            fb_win = w
            print(f"  Found: {t[:80]}")
            break
    
    if not fb_win:
        print("[!] Facebook window not found, trying to find any Facebook content...")
        for w in wins:
            if "facebook" in w.window_text().lower():
                fb_win = w
                break
    
    # Step 3: Look for app selector
    print("[3] Looking for app selector...")
    time.sleep(2)
    
    # Try to find and click "Get Token" or similar
    print("[4] Looking for token generation controls...")
    
    # Get all text on page
    if fb_win:
        texts = get_all_text(fb_win)
        print(f"  Found {len(texts)} text elements")
        for t in texts[:10]:
            print(f"    - {t[:60]}")
    
    # Step 5: Try to find Access Token Tool
    print("\n[5] Navigating to Access Token Tool...")
    navigate(edge, "https://developers.facebook.com/tools/accesstoken/")
    time.sleep(5)
    
    wins = Desktop(backend="uia").windows()
    for w in wins:
        t = w.window_text()
        if "Access Token" in t or "Token" in t:
            print(f"  Found: {t[:80]}")
            fb_win = w
            break
    
    # Step 6: Look for Page Token section
    print("[6] Looking for Page Token section...")
    if fb_win:
        texts = get_all_text(fb_win)
        for t in texts:
            if "page" in t.lower():
                print(f"  Page-related: {t[:80]}")
    
    # Step 7: Try to extract any token-like strings
    print("[7] Searching for token patterns...")
    wins = Desktop(backend="uia").windows()
    all_text = ""
    for w in wins:
        texts = get_all_text(w)
        all_text += " ".join(texts)
    
    # Facebook tokens start with EA...
    tokens = re.findall(r'EA[a-zA-Z0-9]{5,}', all_text)
    if tokens:
        print(f"  Found {len(tokens)} token(s):")
        for t in tokens[:3]:
            print(f"    {t[:30]}...")
    
    print("\n[STATUS] Facebook token page opened in Edge.")
    print("Please complete the token creation manually if automation didn't work.")
    return None

def main():
    token = create_facebook_token()
    if token:
        print(f"\n=== SUCCESS ===")
        print(f"Token: {token}")
        with open("/tmp/facebook_page_token.txt", "w") as f:
            f.write(token)
    else:
        print("\n=== MANUAL ACTION REQUIRED ===")
        print("The Facebook token page is open in Edge.")
        print("Please complete the steps manually.")

if __name__ == "__main__":
    main()
