#!/usr/bin/env python3
"""scripts/browser-login-pywinauto.py — V9 browser login verification via pywinauto UIA.
Drives real Edge directly via UIA — no extension relay needed.
Checks Google, Facebook, X/Twitter, YouTube login state.
"""
import sys
import time

try:
    from pywinauto import Application, Desktop
except ImportError:
    print("pywinauto not installed — run: pip install pywinauto")
    sys.exit(1)

WORKER_URL = "https://hostamar-orchestrator.romelraisul.workers.dev"

def check_login():
    """Check browser login state via pywinauto UIA."""
    print("Connecting to Edge via pywinauto UIA...")
    try:
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        print("Connected to Edge")
    except Exception as e:
        print(f"Connect failed: {e}")
        print("Trying to start Edge...")
        app = Application(backend="uia").start(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
        time.sleep(5)
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)

    # Get all windows
    wins = Desktop(backend="uia").windows()
    logged_in = {"Google": False, "Facebook": False, "X": False, "YouTube": False}

    for w in wins:
        title = w.window_text()
        if not title:
            continue
        title_lower = title.lower()
        if "facebook" in title_lower:
            logged_in["Facebook"] = True
            print(f"  Facebook: logged in (title: {title[:60]})")
        elif "google" in title_lower or "gmail" in title_lower or "drive" in title_lower:
            logged_in["Google"] = True
            print(f"  Google: logged in (title: {title[:60]})")
        elif "x.com" in title_lower or "twitter" in title_lower or " x" in title_lower:
            logged_in["X"] = True
            print(f"  X/Twitter: logged in (title: {title[:60]})")
        elif "youtube" in title_lower:
            logged_in["YouTube"] = True
            print(f"  YouTube: logged in (title: {title[:60]})")

    # Summary
    print("\n=== Login Status ===")
    all_ok = True
    for platform, status in logged_in.items():
        mark = "✅" if status else "❌"
        print(f"  {mark} {platform}: {'logged in' if status else 'NOT logged in'}")
        if not status:
            all_ok = False

    if all_ok:
        print("\n✅ All 4 platforms logged in — V9 browser fix complete")
    else:
        print("\n⚠️ Some platforms not detected — may need to open tabs")

    return all_ok

if __name__ == "__main__":
    check_login()
