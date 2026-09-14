#!/usr/bin/env python3
"""scripts/auto-create-tokens.py — Auto-create Facebook + Google tokens via pyautogui."""
import sys, io, time, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pyautogui

SCREEN_W, SCREEN_H = pyautogui.size()
print(f"Screen: {SCREEN_W}x{SCREEN_H}")

def take_screenshot(name):
    ss = pyautogui.screenshot()
    path = f"/tmp/screen_{name}.png"
    ss.save(path)
    print(f"  Screenshot: {path}")
    return path

def find_and_click(image_path, confidence=0.8):
    """Find an image on screen and click it."""
    try:
        loc = pyautogui.locateOnScreen(image_path, confidence=confidence)
        if loc:
            x, y = pyautogui.center(loc)
            pyautogui.click(x, y)
            print(f"  Clicked at ({x}, {y})")
            return True
    except:
        pass
    return False

def wait_and_click(text, timeout=10):
    """Wait for text to appear and click it."""
    for _ in range(timeout * 2):
        # Try to find text on screen using OCR-like approach
        # For now, just wait
        time.sleep(0.5)
    return False

def main():
    print("=== Auto Token Creation ===\n")
    
    # Step 1: Take initial screenshot
    print("[1] Taking initial screenshot...")
    take_screenshot("initial")
    
    # Step 2: Open Edge and navigate to Facebook
    print("[2] Opening Facebook token page...")
    # Use Win+R to open run dialog
    pyautogui.hotkey('win', 'r')
    time.sleep(0.5)
    pyautogui.typewrite("msedge https://developers.facebook.com/tools/accesstoken/")
    time.sleep(0.3)
    pyautogui.press('enter')
    time.sleep(5)
    
    # Step 3: Take screenshot of Facebook page
    print("[3] Facebook page screenshot...")
    take_screenshot("facebook")
    
    # Step 4: Open new tab for Google Cloud
    print("[4] Opening Google Cloud Console...")
    pyautogui.hotkey('ctrl', 't')
    time.sleep(0.5)
    pyautogui.typewrite("https://console.cloud.google.com/iam-admin/serviceaccounts")
    time.sleep(0.3)
    pyautogui.press('enter')
    time.sleep(5)
    
    # Step 5: Take screenshot of Google Cloud
    print("[5] Google Cloud screenshot...")
    take_screenshot("google_cloud")
    
    # Step 6: Switch back to Facebook tab
    print("[6] Switching to Facebook tab...")
    pyautogui.hotkey('ctrl', '1')
    time.sleep(1)
    take_screenshot("facebook_tab")
    
    print("\n=== Screenshots taken ===")
    print("Please check the screenshots to see the current state.")
    print("Manual completion may be required for React-based UIs.")
    
    # Try to find and click "Get Token" or similar on Facebook
    print("\n[7] Attempting to find token generation controls...")
    
    # Look for common button positions (Facebook UI)
    # These are approximate positions for 1920x1080
    fb_buttons = [
        (960, 400, "Get Token area"),
        (960, 500, "Token generation"),
        (960, 600, "Permissions"),
    ]
    
    for x, y, desc in fb_buttons:
        pyautogui.click(x, y)
        time.sleep(0.5)
        take_screenshot(f"fb_click_{desc.replace(' ', '_')}")
    
    print("\n[STATUS] Pages opened. Check screenshots for state.")

if __name__ == "__main__":
    main()
