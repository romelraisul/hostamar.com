#!/usr/bin/env python3
"""HOSTAMAR OUTREACH DM SYSTEM - Automated DMs to creators"""
import os, json

BASE = "/mnt/c/Users/romel/hostamar-local"
OUTPUT = f"{BASE}/marketing-output/outreach"
os.makedirs(OUTPUT, exist_ok=True)

# DM Templates for different creator sizes
DM_TEMPLATES = {
    "micro_influencer": {
        "target": "1K-10K followers",
        "connection_msg": """Hi {name}! 👋

I've been following your {platform} content and love your style!

I'm the founder of Hostamar.com — we just launched an AI video tool built specifically for Bangladesh creators like you.

🎬 Create videos 10x faster
🎨 50+ professional templates
📱 Full Bangla text support
🆓 5 free videos — no credit card needed

I'd love to send you early access. Would you be interested in trying it out?

No pressure at all — just thought you might find it useful for your content creation.

Best,
Romel""",
        "follow_up_3_days": """Hi {name}! Just checking in — did you get a chance to try Hostamar? 

Even 2 minutes is enough to see how fast it is. 

Here's your direct link: https://hostamar.com

No worries if not — I'm here if you need anything! 🙌""",
        "follow_up_7_days": """Hi {name}! Last message from me — I don't want to be annoying but...

I genuinely think Hostamar could save you hours of editing time each week. 

We've had creators go from 3 hours to 15 minutes per video. 

If you're ever curious: https://hostamar.com

Either way, keep creating amazing content! 🎬"""
    },
    "mid_influencer": {
        "target": "10K-100K followers",
        "connection_msg": """Hi {name}! 👋

I'm Romel, founder of Hostamar.com — an AI video generation platform we just built for Bangladesh creators.

I came across your profile and your content quality is impressive. We'd love to collaborate!

🤝 What we offer:
• FREE lifetime Pro account for content creators
• Early access to all new features
• Revenue sharing on referrals

🎯 What Hostamar does:
• 50+ professional video templates
• Create videos in 5 minutes
• Full Bangla text & font support
• 1080p HD export

Would you be open to a quick demo? I can show you how it works in 5 minutes.

Best,
Romel Raisul
Founder, Hostamar""",
        "follow_up_3_days": """Hi {name}! 

Quick follow-up — would love to give you a free Pro account on Hostamar.

As a creator with {follower_count}+ followers, we'd love to have you as an early adopter.

Demo: https://hostamar.com/demo

Worth 5 minutes of your time? 🙂""",
        "follow_up_7_days": """Hi {name},

I understand you're busy creating content. Just wanted to share that we now have {follower_count}+ creators on Hostamar.

If you ever want to try it — your Pro account is ready: https://hostamar.com/signup

Either way, wishing you continued success! 🚀

- Romel, Hostamar Team"""
    },
    "creator_group": {
        "target": "Facebook Groups / Communities",
        "connection_msg": """Hello everyone! 👋

My name is Romel and I'm the founder of Hostamar.com — a new AI video generation tool built specifically for Bangladesh creators.

🎬 What makes it special:
✅ 50+ professional templates
✅ Full Bangla text support (fonts, subtitles, animation)
✅ Create videos in just 5 minutes
✅ Free for 5 videos/month
✅ Designed for Bangladesh creators by a Bangladesh founder

We're in beta and would love feedback from this community!

🎁 Early access: First 100 users get 50% OFF forever

Anyone interested in trying it out? I'll personally help anyone who wants to get started!

Best,
Romel Raisul
Hostamar Team
https://hostamar.com""",
        "follow_up_3_days": """Hi everyone! 

So far, {signup_count} members from this group have tried Hostamar. 

If you haven't yet — here's your exclusive link:
https://hostamar.com

Any feedback is welcome! We built this for creators like you. 🙏""",
        "follow_up_7_days": """Hi everyone! Quick update:

📊 Hostamar in numbers:
• {total_users}+ creators signed up
• {video_count}+ videos created
• ⭐ 4.9/5 average rating

The platform is now open to everyone: https://hostamar.com

Thank you for your support! We're building this FOR Bangladesh creators. 💪"""
    }
}

# Target creator list (fill in with real names)
TARGET_CREATORS = [
    {"name": "YouTube Creator 1", "platform": "YouTube", "followers": "5K", "type": "micro_influencer"},
    {"name": "YouTube Creator 2", "platform": "YouTube", "followers": "25K", "type": "mid_influencer"},
    {"name": "Facebook Creator 1", "platform": "Facebook", "followers": "10K", "type": "micro_influencer"},
    {"name": "Facebook Creator 2", "platform": "Facebook", "followers": "50K", "type": "mid_influencer"},
]

def generate_dms():
    """Generate all outreach DMs"""
    for creator in TARGET_CREATORS:
        ctype = creator["type"]
        template = DM_TEMPLATES[ctype]
        
        # Connection message
        conn_msg = template["connection_msg"].format(
            name=creator["name"],
            platform=creator["platform"],
            follower_count=creator["followers"]
        )
        
        follow_3 = template["follow_up_3_days"].format(
            name=creator["name"],
            follower_count=creator["followers"],
            signup_count="5",
            total_users="100",
            video_count="1000"
        )
        
        follow_7 = template["follow_up_7_days"].format(
            name=creator["name"],
            follower_count=creator["followers"],
            signup_count="5",
            total_users="100",
            video_count="1000"
        )
        
        filename = f"{creator['name'].replace(' ', '_').lower()}"
        with open(f"{OUTPUT}/{filename}_initial.txt", 'w', encoding='utf-8') as f:
            f.write(f"TO: {creator['name']} ({creator['platform']})\nTYPE: {ctype}\n\n{conn_msg}")
        
        with open(f"{OUTPUT}/{filename}_followup_3d.txt", 'w', encoding='utf-8') as f:
            f.write(f"TO: {creator['name']} (Day 3 follow-up)\n\n{follow_3}")
        
        with open(f"{OUTPUT}/{filename}_followup_7d.txt", 'w', encoding='utf-8') as f:
            f.write(f"TO: {creator['name']} (Day 7 follow-up)\n\n{follow_7}")
    
    total = len(TARGET_CREATORS) * 3
    print(f"✅ Generated {total} outreach DMs in {OUTPUT}/")
    for f in sorted(os.listdir(OUTPUT)):
        print(f"   {f}")

if __name__ == "__main__":
    generate_dms()
    print("\n💡 Copy these DMs and send via Facebook Messenger or LinkedIn")