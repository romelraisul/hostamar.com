#!/usr/bin/env python3
"""HOSTAMAR SEO OPTIMIZER - Meta tags, OG images, keyword optimization"""
import os, json

BASE = "/mnt/c/Users/romel/hostamar-local"
OUTPUT_DIR = f"{BASE}/marketing-output/seo"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# SEO Meta Tags
SEO_META = """<!-- SEO Meta Tags for Hostamar -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hostamar | AI Video Generation for Bangladesh Creators</title>
<meta name="description" content="Create professional videos in 5 minutes with AI. 50+ templates, Bangla text support, HD export. Free for 5 videos/month. Built for Bangladesh creators.">
<meta name="keywords" content="AI video, video editing Bangladesh, Bangla video editor, AI video generator, hostamar, content creation BD, YouTube thumbnail maker, video marketing Bangladesh">
<meta name="author" content="Hostamar">
<meta name="robots" content="index, follow">

<!-- Open Graph / Facebook -->
<meta property="og:title" content="Hostamar - AI Video Generation for Bangladesh">
<meta property="og:description" content="Create professional videos in 5 minutes. 50+ templates, Bangla support, HD export. Free trial available!">
<meta property="og:image" content="https://hostamar.com/og-image.png">
<meta property="og:url" content="https://hostamar.com">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hostamar">
<meta property="og:locale" content="bn_BD">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Hostamar - AI Video for Bangladesh Creators">
<meta name="twitter:description" content="AI video: 50+ templates, Bangla support, 5 min videos, Free trial">
<meta name="twitter:image" content="https://hostamar.com/twitter-card.png">

<!-- Canonical -->
<link rel="canonical" href="https://hostamar.com">

<!-- Google Site Verification -->
<meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE">

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
"""

# Plausible Analytics
PLAUSIBLE_SCRIPT = """<!-- Plausible Analytics -->
<script defer data-domain="hostamar.com" src="https://plausible.io/js/script.js"></script>
"""

# Save SEO files
with open(f"{OUTPUT_DIR}/meta-tags.html", 'w', encoding='utf-8') as f:
    f.write(SEO_META)

with open(f"{OUTPUT_DIR}/plausible.html", 'w', encoding='utf-8') as f:
    f.write(PLAUSIBLE_SCRIPT)

with open(f"{OUTPUT_DIR}/robots.txt", 'w', encoding='utf-8') as f:
    f.write("User-agent: *\nAllow: /\nSitemap: https://hostamar.com/sitemap.xml\nDisallow: /admin/\nDisallow: /.env\n")

# OG Image prompt for AI generation
og_prompt = {
    "prompt": "Professional SaaS landing page hero image, AI video generation theme, dark gradient blue-purple background, floating video thumbnails and play buttons, modern clean design, 1200x630",
    "size": "1200x630",
    "format": "png"
}
with open(f"{OUTPUT_DIR}/og-image-prompt.json", 'w', encoding='utf-8') as f:
    json.dump(og_prompt, f, indent=2)

print(f"SEO files saved to {OUTPUT_DIR}/")
print("  meta-tags.html     -> Paste into _document.tsx or layout.tsx <head>")
print("  plausible.html     -> Paste before </body> in layout.tsx")
print("  robots.txt         -> Place in public/ directory")
print("  og-image-prompt.json -> Use with image AI to generate OG image")
print("\n✅ SEO optimization ready for deployment")