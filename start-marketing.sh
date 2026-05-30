#!/bin/bash
# HOSTAMAR AUTO MARKETING LAUNCH SCRIPT
# Run this to start all marketing automation

echo "🚀 HOSTAMAR AUTO MARKETING LAUNCH"
echo "=================================="
echo ""

# 1. Run Python marketing automation
echo "📝 Generating marketing content..."
python3 auto-marketing.py

# 2. Copy content to easy access locations
echo ""
echo "📂 Organizing content..."
mkdir -p /mnt/c/Users/romel/hostamar-local/MARKETING-READY

# Create master copy
cp /mnt/c/Users/romel/hostamar-local/auto-posts/post_launch_*.txt /mnt/c/Users/romel/hostamar-local/MARKETING-READY/FACEBOOK_LAUNCH_POST.txt 2>/dev/null || true

echo ""
echo "✅ Marketing content generated!"
echo ""
echo "=== YOUR MARKETING CONTENT ==="
echo ""
ls -la /mnt/c/Users/romel/hostamar-local/auto-posts/ 2>/dev/null
echo ""
ls -la /mnt/c/Users/romel/hostamar-local/youtube-content/ 2>/dev/null
echo ""
echo "=== NEXT STEPS ==="
echo "1. Copy Facebook post to your 400K+ group"
echo "2. Share YouTube scripts for video creation"  
echo "3. Send WhatsApp broadcast to creator groups"
echo "4. Send email to your list"
echo ""
echo "🎯 Site: https://hostamar.com"
echo "🎁 Offer: 50% OFF for first 100 customers"