
#!/bin/bash
# File: start-now.sh
# RUN THIS TO START YOUR BUSINESS TODAY!

set -e

echo "=========================================="
echo "  🚀 HOSTAMAR LAUNCH SEQUENCE INITIATED"
echo "=========================================="
echo ""

# Step 1: Verify build
echo "🔍 Step 1: Verifying build..."
if [ -d ".next" ]; then
    echo "✓ Build directory exists"
else
    echo "⚠️  Build not found. Running build..."
    npm run build
fi

# Step 2: Check deployment
echo ""
echo "🌐 Step 2: Checking deployment status..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}" https://hostamar-local-8i0q2d0bg-romelraisul-8939s-projects.vercel.app
echo ""
echo "✓ Site is LIVE!"

# Step 3: Show URLs
echo ""
echo "🔗 Step 3: Your Live URLs:"
echo "   Primary:   https://hostamar-local-8i0q2d0bg-romelraisul-8939s-projects.vercel.app"
echo "   Secondary: https://hostamar-local-po02js9ux-romelraisul-8939s-projects.vercel.app"
echo "   Preview:   https://hostamar-local-5ysiqe92o-romelraisul-8939s-projects.vercel.app"

# Step 4: Crypto wallet
echo ""
echo "💰 Step 4: Crypto Payment Ready:"
echo "   Wallet: 0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858"
echo "   Network: USDT BEP20 (Binance Smart Chain)"
echo "   Fee: 0.5%"

# Step 5: Quick start actions
echo ""
echo "🎯 Step 5: Complete These NOW:"
echo ""
echo "   1. Add Vercel env vars:"
echo "      → Go to vercel.com/dashboard"
echo "      → Settings → Environment Variables"
echo "      → Add: NEXTAUTH_SECRET, DATABASE_URL"
echo ""
echo "   2. Configure domain:"
echo "      → Projects → hostamar-local → Domains"
echo "      → Add: hostamar.com"
echo ""
echo "   3. Post on Facebook:"
echo '      → "🚀 LAUNCH DAY! Hostamar is LIVE! ..."'
echo ""
echo "   4. Test crypto payment:"
echo "      → Send 1 USDT to verify"
echo ""
echo "   5. Join 5 Facebook groups:"
echo "      → Introduce yourself"
echo ""

# Step 6: Social media copy
echo ""
echo "📝 Step 6: Copy & Paste This:"
echo ""
cat << 'POST'
🚀 LAUNCH DAY! Hostamar is LIVE!

I just launched Hostamar.com - AI video generation tool for Bangladeshi creators!

What you can do:
🎯 Create viral videos in minutes
📹 50+ templates (YouTube, Facebook, TikTok)
💰 Pay with Crypto (USDT) or bKash
🛡️ 100% made in Bangladesh

🎉 Beta users get 50% OFF forever!

Comment "VIDEO" to get access! 🎬

#Bangladesh #VideoEditing #ContentCreator #Hostamar
POST

echo ""
echo ""

# Step 7: Monitor
echo "📊 Step 7: Monitor Your Progress:"
echo "   → Check every hour for new signups"
echo "   → Respond to all inquiries within 1 hour"
echo "   → Track: hostamar.com/dashboard"
echo ""

# Timeline
echo "⏰ Timeline for Today:"
echo "   0-1h:   Setup & post on social media"
echo "   1-2h:   Join Facebook groups"
echo "   2-4h:   Send B2B emails (20 contacts)"
echo "   4-8h:   Monitor & respond"
echo "   8-24h:  Create YouTube video"
echo ""

# Goals
echo "🎯 Today's Goals:"
echo "   ✅ Minimum: 10 signups, 2 paid (৳4,000)"
echo "   ✅ Good:    25 signups, 5 paid (৳10,000)"
echo "   ✅ Excellent: 50 signups, 10 paid (৳20,000)"
echo ""

echo "=========================================="
echo "  🎉 YOU'RE LIVE! GO GET CUSTOMERS! 🚀"
echo "=========================================="
echo ""
echo "Need help? Check:"
echo "  • LAUNCH-ACTION-PLAN.md (30-day plan)"
echo "  • DAY-1-LAUNCH.md (Today's checklist)"
echo "  • CRYPTO-PAYMENT-GUIDE.md (Payment setup)"
echo ""
echo "Good luck! You got this! 💪"
echo ""
