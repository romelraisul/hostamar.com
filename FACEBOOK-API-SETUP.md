================================================================================
                 FACEBOOK API SETUP GUIDE — HOSTAMAR PROJECT
================================================================================

This guide walks through creating a Facebook App in Meta Developer Portal,
obtaining a Page Access Token, finding your Facebook Page ID, and configuring
the FB_PAGE_ID and FB_ACCESS_TOKEN in your .env file so that the Hostamar
automation scripts can post to Facebook.

Contents
--------
  1.  Create a Facebook App in Meta Developer Portal
  2.  Add the Facebook Graph API Product
  3.  Generate a Page Access Token
  4.  Find Your Facebook Page ID (FB_PAGE_ID)
  5.  Configure .env Variables
  6.  Test the Connection
  7.  Troubleshooting Common Issues
  8.  Reference: How fb-poster.py Uses the API
  9.  Token Expiry & Token Management

================================================================================
1. CREATE A FACEBOOK APP IN META DEVELOPER PORTAL
================================================================================

  Step 1: Go to Meta Developer Portal
  ─────────────────────────────────────
  Open: https://developers.facebook.com/

  Sign in with your personal Facebook account (the one that has admin access
  to the Facebook Page you want to post to).

  Step 2: Create a New App
  ─────────────────────────
  Click "My Apps" (top-right) → "Create App".

  Step 3: Choose App Type
  ───────────────────────
  Select "Business" as the app type (this is required for accessing Page
  APIs). Click "Next".

  Step 4: App Details
  ───────────────────
  • App Name:  "Hostamar Marketing" (or anything descriptive)
  • App Contact Email:  your email address
  • Business Account:   Select or create a business account (you can create
    one quickly if you don't have one).

  Click "Create App".

  Step 5: Verify with 2FA (if prompted)
  ─────────────────────────────────────
  If you have two-factor authentication enabled, complete the verification.

  Done! You now have a Facebook App. You'll land on the app dashboard.

================================================================================
2. ADD THE FACEBOOK GRAPH API PRODUCT
================================================================================

  Step 1: Add the Graph API
  ─────────────────────────
  On the app dashboard, scroll down to "Add a Product" (or look in the
  left sidebar). Click "Set Up" under "Facebook Graph API".

  Step 2: Add Permissions
  ────────────────────────
  In the left sidebar, click "App Review" → "Permissions and Features".

  Request the following permissions (you may need to submit for review if
  your app is public, but for development/testing you can use the app in
  "Development Mode"):

    Required:
    ─────────
    ✓ pages_manage_posts        — Post to pages you manage
    ✓ pages_read_engagement     — Read page insights and post engagement

    Optional (for Group posting):
    ─────────────────────────────
    ✓ publish_to_groups         — Post to Facebook groups (needs App Review)
    ✓ groups_access_member_info — Read group member data

  For development, these permissions work immediately for users/admins of
  the app. For production / public apps, you'll need to submit for Meta
  App Review (see Section 9).

  Step 3: Add Your Page to the App (if needed)
  ─────────────────────────────────────────────
  If prompted, add the Facebook Page you want to manage. You can also do
  this later when generating the token.

================================================================================
3. GENERATE A PAGE ACCESS TOKEN (FB_ACCESS_TOKEN)
================================================================================

  There are two methods — use the Graph API Explorer for quick testing, or
  generate a Long-Lived Token for production.

  ───────────────────────────────────────────────────────────────────────
  METHOD A: Graph API Explorer (Quick & Easy — for testing)
  ───────────────────────────────────────────────────────────────────────

  Step 1: Open Graph API Explorer
  ───────────────────────────────
  Go to: https://developers.facebook.com/tools/explorer/

  Step 2: Select Your App
  ───────────────────────
  From the "Meta App" dropdown (top-right of the explorer), select the app
  you just created ("Hostamar Marketing").

  Step 3: Get a User Token
  ─────────────────────────
  • Permissions dropdown:  Select these scopes:
      - pages_manage_posts
      - pages_read_engagement
      - pages_show_list
      - public_profile
  • Click "Generate Access Token"
  • You'll be prompted with a Facebook login dialog — click "Continue" and
    accept the permissions.

  Step 4: Exchange for a Page Access Token
  ────────────────────────────────────────
  In the Graph API Explorer:
  • Make a GET request to:  me/accounts
  • Click "Submit" (or press Enter).

  Response will show a list of pages you manage. Find your page and copy
  the "access_token" field — this is your Page Access Token.

  Alternatively, use the "Get Page Token" dropdown in the explorer UI
  (near the token field) to select your page directly.

  Step 5: Copy the Token
  ──────────────────────
  The token will look like a long string starting with "EAA..." or "EAAC...".
  Copy it. This is your FB_ACCESS_TOKEN.

  ⚠️  This token is short-lived (about 1-2 hours). For production, use
      Method B below to exchange it for a long-lived token.

  ───────────────────────────────────────────────────────────────────────
  METHOD B: Long-Lived Page Access Token (Production)
  ───────────────────────────────────────────────────────────────────────

  A long-lived page token expires in 60 days (and can be refreshed).

  Step 1: Get a Short-Lived User Token
  ────────────────────────────────────
  Same as Method A Step 3. Copy the short-lived user access token.

  Step 2: Exchange for a Long-Lived User Token
  ─────────────────────────────────────────────
  Make a GET request to:

    GET https://graph.facebook.com/v19.0/oauth/access_token
      ?grant_type=fb_exchange_token
      &client_id={YOUR_APP_ID}
      &client_secret={YOUR_APP_SECRET}
      &fb_exchange_token={SHORT_LIVED_USER_TOKEN}

  Where:
    YOUR_APP_ID           = From your app dashboard (a number like 123456789)
    YOUR_APP_SECRET       = From your app dashboard → Settings → Basic
    SHORT_LIVED_USER_TOKEN = The token from Step 1

  The response will contain a new "access_token" — your long-lived user token
  (valid ~60 days).

  Step 3: Get a Long-Lived Page Token
  ────────────────────────────────────
  Use the long-lived user token from Step 2:

    GET https://graph.facebook.com/v19.0/me/accounts
      ?access_token={LONG_LIVED_USER_TOKEN}

  Find your page in the response and copy its "access_token" — this is your
  long-lived Page Access Token (~60 days).

  Step 4: Store the Token
  ───────────────────────
  Save this as FB_ACCESS_TOKEN in your .env file.

  ───────────────────────────────────────────────────────────────────────
  METHOD C: Using the Token Tool (Debug & Get Tokens)
  ───────────────────────────────────────────────────────────────────────

  Go to: https://developers.facebook.com/tools/debug/accesstoken/

  Paste any token to see its:
  • Expiry date
  • Permissions/scopes
  • Associated app and user

  You can also use this tool to refresh an expired token (the "Extend
  Access Token" button, if available).

================================================================================
4. FIND YOUR FACEBOOK PAGE ID (FB_PAGE_ID)
================================================================================

  Every Facebook Page has a unique numeric ID. You'll use this as FB_PAGE_ID.

  ───────────────────────────────────────────────────────────────────────
  METHOD A: From the Page "About" Section (Recommended)
  ───────────────────────────────────────────────────────────────────────

  1. Go to your Facebook Page
  2. Click "About" in the left sidebar (or scroll down on mobile)
  3. Look for "Page ID" — it's a numeric string like "123456789012345"
  4. Copy this number

  ───────────────────────────────────────────────────────────────────────
  METHOD B: From Page URL (Simpler)
  ───────────────────────────────────────────────────────────────────────

  If your page URL is:
    https://www.facebook.com/HostamarBD

  You can use a tool or the Graph API to look up the ID:

    GET https://graph.facebook.com/v19.0/HostamarBD?access_token={TOKEN}

  Response:
    { "name": "Hostamar", "id": "123456789012345" }

  ───────────────────────────────────────────────────────────────────────
  METHOD C: Using the Graph API Explorer
  ───────────────────────────────────────────────────────────────────────

  1. Open: https://developers.facebook.com/tools/explorer/
  2. Select your app and token
  3. Run GET request to:  me/accounts
  4. Each page object in the response has an "id" field — that's FB_PAGE_ID

  ───────────────────────────────────────────────────────────────────────
  METHOD D: From the Page Source
  ───────────────────────────────────────────────────────────────────────

  1. Go to your Facebook Page
  2. Right-click anywhere on the page → "View Page Source"
  3. Press Ctrl+F and search for "page_id"
  4. You'll find something like: "page_id":"123456789012345"
  5. Copy that number

================================================================================
5. CONFIGURE .ENV VARIABLES
================================================================================

  Step 1: Locate the .env File
  ────────────────────────────
  The project .env file is at:
    /mnt/c/Users/romel/hostamar-local/.env

  Step 2: Add These Variables
  ────────────────────────────
  Open the .env file and add or uncomment these lines:

    # ===== FACEBOOK API =====
    FB_PAGE_ID=123456789012345
    FB_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    FB_GRAPH_API_VERSION=v19.0

  Replace the placeholders with your actual values:
    • FB_PAGE_ID       = The numeric Page ID from Section 4
    • FB_ACCESS_TOKEN  = The Page Access Token from Section 3
    • FB_GRAPH_API_VERSION = (optional, defaults to v19.0 in the scripts)

  Step 3: (Optional) Add Default Group ID
  ───────────────────────────────────────
  If you'll be posting to a specific Facebook Group frequently:

    FB_GROUP_ID=YOUR_GROUP_ID_HERE

  Step 4: Save and Verify
  ───────────────────────
  After editing, verify the variables load correctly:

    cd /mnt/c/Users/romel/hostamar-local
    python3 -c "from dotenv import load_dotenv; import os; load_dotenv(); print('FB_PAGE_ID:', os.getenv('FB_PAGE_ID', '⚠️ NOT SET')); print('FB_ACCESS_TOKEN:', '✅ Set (' + os.getenv('FB_ACCESS_TOKEN', '')[:10] + '...)' if os.getenv('FB_ACCESS_TOKEN') else '⚠️ NOT SET')"

  If python-dotenv is not installed:

    pip install python-dotenv

  Step 5: .env Security
  ─────────────────────
  IMPORTANT: Never commit your .env file to version control.
  The .env file is already in .gitignore for this project (verify with:

    cat /mnt/c/Users/romel/hostamar-local/.gitignore | grep .env

  If it's not there, add ".env" to .gitignore immediately.

================================================================================
6. TEST THE CONNECTION
================================================================================

  Step 1: Quick Token Check
  ─────────────────────────
    cd /mnt/c/Users/romel/hostamar-local
    python3 scripts/fb-poster.py --check-token

  This shows:
    • Whether the token is valid
    • Expiration date
    • Granted permissions

  Step 2: Test API Connection
  ───────────────────────────
    python3 scripts/fb-poster.py --test

  This posts a test message and immediately deletes it. If successful,
  you'll see:
    "✅ Facebook API connection is WORKING!"

  If it fails, see Section 7 (Troubleshooting).

  Step 3: Post All Marketing Content
  ──────────────────────────────────
  First generate the posts:

    python3 mkt-auto.py

  Then publish them:

    python3 scripts/fb-poster.py --post-all

================================================================================
7. TROUBLESHOOTING COMMON ISSUES
================================================================================

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "Token validation error" / "Error code 190"
  ───────────────────────────────────────────────────────────────────────
  Cause: The access token is invalid or expired.
  Fix:
    • Go to https://developers.facebook.com/tools/debug/accesstoken/
    • Paste your token to check its status
    • Generate a new token following Section 3
    • If using a short-lived token, switch to a long-lived one (Method B)

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "Permission error" / "Error code 200"
  ───────────────────────────────────────────────────────────────────────
  Cause: The token doesn't have the required permissions.
  Fix:
    • Make sure you requested pages_manage_posts and pages_read_engagement
    • Regenerate the token after granting permissions
    • Go to App Dashboard → App Review → Permissions and verify scopes
    • Use the Graph API Explorer to test: me/permissions

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "(#100) Page access restricted" / "App not in Live mode"
  ───────────────────────────────────────────────────────────────────────
  Cause: The app is in Development mode, and the user who generated the
         token is not listed as a developer/tester of the app.
  Fix:
    • Go to App Dashboard → Roles → add the page admin as a developer
    • OR switch the app to Live mode (requires App Review for permissions)

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "Rate limited" / "Error code 368"
  ───────────────────────────────────────────────────────────────────────
  Cause: You've hit Facebook's rate limit.
  Fix:
    • Wait a few minutes before trying again
    • The fb-poster.py script includes 3-second delays between posts
    • For bulk posting, use the built-in retry logic (it waits 60s then
      retries on rate limit errors)
    • Check your rate limit status:
      GET https://graph.facebook.com/v19.0/{page-id}/?fields=rate_limit_settings&access_token={token}

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "Cannot post to group" / "Group posting fails"
  ───────────────────────────────────────────────────────────────────────
  Cause: Group posting requires additional permissions.
  Fix:
    • The token must have publish_to_groups permission
    • Your Facebook account must be a member of the group
    • The group must allow member posts (some groups are admin-only)
    • This permission requires Meta App Review for public use
    • For development, make yourself an admin/tester of the app

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "File not found" / "No fb_*.txt files"
  ───────────────────────────────────────────────────────────────────────
  Cause: The marketing post files haven't been generated yet.
  Fix:
    python3 /mnt/c/Users/romel/hostamar-local/mkt-auto.py
    # or
    python3 /mnt/c/Users/romel/hostamar-local/marketing-engine.py

  Then try posting again.

  ───────────────────────────────────────────────────────────────────────
  PROBLEM: "App not yet set up / Cannot load the app"
  ───────────────────────────────────────────────────────────────────────
  Cause: The app hasn't been fully configured.
  Fix:
    • Go to App Dashboard → Settings → Basic
    • Add a "Privacy Policy URL" (even a temporary one like
      https://hostamar.com/privacy)
    • Add an "App Icon" (any image)
    • Set the "Category" to something relevant
    • Toggle the "App Secret" visibility if needed

================================================================================
8. REFERENCE: HOW FB-POSTER.PY USES THE API
================================================================================

  The main Facebook posting script is:

    /mnt/c/Users/romel/hostamar-local/scripts/fb-poster.py

  ───────────────────────────────────────────────────────────────────────
  Environment Variables It Reads
  ───────────────────────────────────────────────────────────────────────

    Variable              Used For
    ─────────────────────────────────────────────────────────────
    FB_PAGE_ID            Target Page to post to
    FB_ACCESS_TOKEN       Page access token for API authentication
    FB_GROUP_ID           Default group (optional, for --group command)

  ───────────────────────────────────────────────────────────────────────
  API Endpoints Used
  ───────────────────────────────────────────────────────────────────────

    1. POST to Page feed (text posts):
       POST https://graph.facebook.com/v19.0/{FB_PAGE_ID}/feed
       Body:  message=<text>&access_token=<token>

    2. POST to Group feed:
       POST https://graph.facebook.com/v19.0/{group_id}/feed
       Body:  message=<text>&access_token=<token>

    3. POST to Page with photo:
       POST https://graph.facebook.com/v19.0/{FB_PAGE_ID}/photos
       Body:  multipart (source=image, message=<text>, access_token=<token>)

    4. DELETE a post (test cleanup):
       DELETE https://graph.facebook.com/v19.0/{post_id}
       Params: access_token=<token>

    5. Token debug:
       GET https://graph.facebook.com/v19.0/debug_token
       Params: input_token=<token>&access_token=<token>

    6. List pages (find Page ID):
       GET https://graph.facebook.com/v19.0/me/accounts
       Params: access_token=<token>

  ───────────────────────────────────────────────────────────────────────
  CLI Commands
  ───────────────────────────────────────────────────────────────────────

    Command                          What It Does
    ─────────────────────────────────────────────────────────────────
    --post-all                       Post all fb_*.txt files from
                                     marketing-output/ directory
    --test                           Post a test message & delete it
    --post <filename>                Post a single file
    --group <group_id>               Post launch message to a group
    --check-token                    Validate & display token info
    --photo <path>                   Post a photo with message text

  ───────────────────────────────────────────────────────────────────────
  Files That Depend on FB_PAGE_ID / FB_ACCESS_TOKEN
  ───────────────────────────────────────────────────────────────────────

    File                               How It Uses FB Env Vars
    ──────────────────────────────────────────────────────────────────
    scripts/fb-poster.py               Direct API calls (Graph API v19.0)
    marketing-engine.py                API call ready (commented out:
    (CONFIG)                            "Actual API call would go here")
    auto-marketing.py                  Saves posts to files (no direct
                                        API call yet — placeholder)
    mkt-auto.py                        Generates FB post text files

  Note: marketing-engine.py has a facebook_post() function that loads
  FB_PAGE_ID and FB_ACCESS_TOKEN from CONFIG but the actual API request
  line is commented out with the note "Actual API call would go here."
  Once you configure the .env variables, you can uncomment and activate
  that function.

================================================================================
9. TOKEN EXPIRY & TOKEN MANAGEMENT
================================================================================

  ───────────────────────────────────────────────────────────────────────
  Token Types and Lifetimes
  ───────────────────────────────────────────────────────────────────────

    Token Type             Lifetime          Notes
    ──────────────────────────────────────────────────────────────────
    Short-Lived User       ~1-2 hours        Initial token from login
    Long-Lived User        ~60 days          Exchanged from short-lived
    Short-Lived Page       ~1-2 hours        Direct from Graph Explorer
    Long-Lived Page        ~60 days          Exchanged via long-lived
                                             user token
    Page (with "Never
     Expire" option)       Indefinite        Less common; requires
                                             page token re-exchange

  ───────────────────────────────────────────────────────────────────────
  Refreshing a Long-Lived Token
  ───────────────────────────────────────────────────────────────────────

  Long-lived tokens can be refreshed before they expire using the same
  fb_exchange_token endpoint. Each refresh gives you a new 60-day token.

  To refresh:

    GET https://graph.facebook.com/v19.0/oauth/access_token
      ?grant_type=fb_exchange_token
      &client_id={APP_ID}
      &client_secret={APP_SECRET}
      &fb_exchange_token={CURRENT_LONG_LIVED_TOKEN}

  ⚠️  You can refresh a token at most once per day.

  ───────────────────────────────────────────────────────────────────────
  Token Monitoring (Recommended)
  ───────────────────────────────────────────────────────────────────────

  Check token expiry regularly with:

    python3 scripts/fb-poster.py --check-token

  Or programmatically by parsing the token debug endpoint response.

  Set a reminder to refresh tokens every 50 days to avoid disruption.

  ───────────────────────────────────────────────────────────────────────
  Automation for Token Refresh
  ───────────────────────────────────────────────────────────────────────

  You can create a cron job that runs monthly:

    0 0 1 * * cd /mnt/c/Users/romel/hostamar-local && python3 scripts/fb-poster.py --check-token >> logs/token-check.log 2>&1

  If the token is near expiry, the script will show a warning in the log.

================================================================================
10. APP REVIEW FOR PRODUCTION (Going Live)
================================================================================

  If you want other people (not just you) to use the app, you must submit
  it for Meta App Review. Here's what that involves:

  Step 1: Switch to Live Mode
  ───────────────────────────
  In App Dashboard → Settings → Basic → toggle "App Mode" from
  "Development" to "Live".

  Step 2: Submit Permissions for Review
  ─────────────────────────────────────
  App Dashboard → App Review → Permissions and Features
  • Find pages_manage_posts, pages_read_engagement
  • Click "Request Review" or "Submit for Review"
  • Provide:
      - Detailed justification of how you use each permission
      - Screen recording / video demo of the feature
      - Screenshots of the Facebook Page integration
      - Privacy Policy URL (must be live)
      - Terms of Service URL

  Step 3: Wait for Review
  ───────────────────────
  Meta typically takes 5-14 business days to review. You may be asked
  for additional info.

  Step 4: Once Approved
  ─────────────────────
  Your app goes Live. Anyone can install it and grant permissions.

  Note: For the Hostamar project (which is your own app for your own
  Facebook Page), you do NOT need App Review. Development mode with
  you as the admin is sufficient.

================================================================================
11. QUICK START CHECKLIST
================================================================================

  ☐ Create a Facebook App at https://developers.facebook.com/
  ☐ Add the Graph API product
  ☐ Request pages_manage_posts permission
  ☐ Generate a Page Access Token (Graph API Explorer)
  ☐ Exchange for a Long-Lived Token (60 days)
  ☐ Find your Page ID (from Page About section)
  ☐ Add FB_PAGE_ID and FB_ACCESS_TOKEN to .env
  ☐ Run: python3 scripts/fb-poster.py --check-token
  ☐ Run: python3 scripts/fb-poster.py --test
  ☐ Generate posts: python3 mkt-auto.py
  ☐ Post to Facebook: python3 scripts/fb-poster.py --post-all
  ☐ Set a calendar reminder to refresh the token every 50 days

================================================================================
12. QUICK REFERENCE — IMPORTANT URLs
================================================================================

  Meta Developer Portal         https://developers.facebook.com/
  App Dashboard                 https://developers.facebook.com/apps/
  Graph API Explorer            https://developers.facebook.com/tools/explorer/
  Token Debug Tool              https://developers.facebook.com/tools/debug/accesstoken/
  Graph API Docs (v19.0)        https://developers.facebook.com/docs/graph-api/reference/v19.0
  Page Feed API                 https://developers.facebook.com/docs/graph-api/reference/v19.0/page/feed
  Pages API Docs                https://developers.facebook.com/docs/pages/
  Access Token Guide            https://developers.facebook.com/docs/facebook-login/access-tokens
  Permission Reference          https://developers.facebook.com/docs/permissions/reference
  App Review Guide              https://developers.facebook.com/docs/app-review

================================================================================
END OF GUIDE
================================================================================
