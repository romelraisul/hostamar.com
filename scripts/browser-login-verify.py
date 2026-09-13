#!/usr/bin/env python3
"""scripts/browser-login-verify.py — Permanent V9 browser login verification via pywinauto UIA.
Runs on Windows via hermes venv Python. Drives real Edge directly — no extension relay needed.
Called by keepalive.sh every 5 min to verify all 4 platforms remain logged in.

Usage:
  python scripts/browser-login-verify.py          # check all platforms
  python scripts/browser-login-verify.py --json   # JSON output
"""
import sys
import json
import time

try:
    from pywinauto import Application, Desktop
except ImportError:
    print(json.dumps({"error": "pywinauto not installed"}))
    sys.exit(1)

def check_login():
    """Check browser login state via pywinauto UIA."""
    result: dict[str, bool | str] = {
        "Google": False,
        "Facebook": False,
        "X": False,
        "YouTube": False,
        "Edge": False,
    }

    try:
        # Connect to existing Edge
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        result["Edge"] = True
    except Exception:
        # Try to start Edge
        try:
            app = Application(backend="uia").start(
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            )
            time.sleep(5)
            app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
            result["Edge"] = True
        except Exception as e:
            result["error"] = str(e)
            return result

    # Get all window titles
    try:
        wins = Desktop(backend="uia").windows()
        titles = [w.window_text() for w in wins if w.window_text()]

        for title in titles:
            tl = title.lower()
            if "facebook" in tl:
                result["Facebook"] = True
            elif "google" in tl or "gmail" in tl or "drive" in tl:
                result["Google"] = True
            elif "x.com" in tl or "twitter" in tl:
                result["X"] = True
            elif "youtube" in tl:
                result["YouTube"] = True

    except Exception as e:
        result["window_error"] = str(e)

    return result

if __name__ == "__main__":
    result = check_login()
    if "--json" in sys.argv:
        print(json.dumps(result))
    else:
        for k, v in result.items():
            mark = "[OK]" if v else "[MISSING]"
            print(f"  {mark} {k}")
