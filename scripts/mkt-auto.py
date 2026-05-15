#!/usr/bin/env python3
"""HOSTAMAR FULL MARKETING AUTOMATION - Retry Version"""
import os
from datetime import datetime

os.makedirs('marketing-output', exist_ok=True)

# ============================================
# 1. FACEBOOK POSTS (7 posts)
# ============================================
fb_posts = [
    ('P001_launch', 'HOSTAMAR.COM IS LIVE!', '''আপনার ছবি, ভিডিও, অ্যানিমেশন সবই এখন এক ক্লিকে তৈরি করুন!
🎬 AI Video Generation | ৫০+ টেমপ্লেট | বাংলা টেক্সট সাপোর্ট | ৫ মিনিটে ভিডিও!
🎁 Beta Users: ৫০% OFF (First 100 customers)
💰 Free: ৫ videos/month | Starter: ৳২,০০০ | Business: ৳৩,৫০০ | Enterprise: ৳৬,০০০
Comment "VIDEO" for early access!
#Bangladesh #VideoEditing #ContentCreator #Hostamar #StartUpBD'''),
    ('P002_problem', '"ভিডিও তৈরি করতে গিয়ে রাত হয়ে যায়"', '''সমস্যা: ঘণ্টার পর ঘণ্টা কেটে যায়!
সমাধান: Hostamar.com ✅
✅ ৫০+ টেমপ্লেট | ✅ ড্র্যাগ-এন্ড-ড্রপ | ✅ ১০৮০পি | ✅ ৫ মিনিটে রেজুল্ট
Free trial: ৫ videos | #VideoEditingBD #BangladeshCreators'''),
    ('P003_benefits', '৩ মাসের কাজ ৩ ঘন্টায় সম্পন্ন!', '''💰 ৬০% সময় বাঁচালাম | 🎯 ৪০% বেশি এনগেজমেন্ট | 📈 ২০০% রিচ বাড়িয়েছি
🆓 Free: ৫ videos | 💼 Starter: ৳২,০০০ | 🚀 Business: ৳৩,৫০০
#AI #VideoMarketing #Bangladesh'''),
    ('P004_social', 'স্বাগতম প্রথম ১০০টি কাস্টমার!', '''👥 ১০০+ Creators | 🎬 ১,০০০+ Videos | ⭐ ৪.৯/৫ রেটিং
আপনার টার্ন আনুন: https://hostamar.com
#SuccessStory #VideoCreator'''),
    ('P005_urgency', 'LAST CHANCE: Beta ৫০% OFF Ending!', '''🔥 ৫০% OFF Ending Soon | First 100 only
❌ Without: ৳৪,০০০ | ✅ With Hostamar: ৳২,০০০
✅ ১০ HD Videos | ✅ ৫০+ টেমপ্লেট | ✅ Bangla Support
#LimitedOffer #BangladeshDeals'''),
    ('P006_tutorial', 'How to Make a Video in 5 Minutes', '''1️⃣ Go to hostamar.com | 2️⃣ Choose template | 3️⃣ Upload media
4️⃣ Add Bangla text | 5️⃣ Generate & Download!
No editing skills needed. Try Free: 5 videos/month
#Tutorial #VideoEditing #Hostamar'''),
    ('P007_comparison', 'Hostamar vs Manual Editing', '''বাংলায় পাওয়া যায় না: ❌ বাংলা সাবটাইটেল | Hostamar: ✅ বাংলা টেক্সট ✅ ফন্ট ✅ RTL
সবকিছু এক জায়গায়! #Hostamar #BanglaVideo'''),
]

for name, title, body in fb_posts:
    with open(f'marketing-output/fb_{name}.txt', 'w', encoding='utf-8') as f:
        f.write(f'FACEBOOK POST | {title}\n\n{body}')
    print(f'   fb_{name}.txt')

# ============================================
# 2. WHATSAPP MESSAGES
# ============================================
wa_groups = ['YouTube_Creators_BD', 'FB_Video_Editors', 'Content_Creators_BD',
             'Digital_Marketing_BD', 'Startup_BD', 'Video_Pros', 'Social_Media_BD']
wa_msgs = [
    '🎬 Hostamar.com is LIVE! AI video for BD creators. 50% OFF first 100! https://hostamar.com Reply YES for demo.',
    '🚀 Tired of slow editing? Hostamar creates pro videos in 5 min! Bangla support. Free: 5 videos https://hostamar.com',
    '💰 Make more with AI videos! 5x faster content. From ৳2000/month. https://hostamar.com',
]
for g in wa_groups:
    for i, msg in enumerate(wa_msgs):
        with open(f'marketing-output/wa_{g}_msg{i}.txt', 'w', encoding='utf-8') as f:
            f.write(f'GROUP: {g}\n\n{msg}')

# ============================================
# 3. EMAIL TEMPLATES
# ============================================
emails = {
    'welcome': 'Subject: Welcome to Hostamar!\n\nWelcome! 5 free videos waiting.\nLogin: https://hostamar.com/login',
    'upgrade': 'Subject: 50% OFF Upgrade Now!\n\nStarter ৳2000/mo or Business ৳3500/mo. Ends Sunday!\nhttps://hostamar.com/pricing',
    'reengage': 'Subject: We miss you!\n\nNew templates added. Come back!\nLogin: https://hostamar.com/login',
}
for name, content in emails.items():
    with open(f'marketing-output/email_{name}.txt', 'w', encoding='utf-8') as f:
        f.write(content)

# ============================================
# 4. YOUTUBE SCRIPTS
# ============================================
yt_videos = [
    ('5_Min_Tutorial', 'How to Make a Video in 5 Minutes', '0:00 Intro | 0:30 Template | 1:15 Media | 2:00 Bangla | 3:00 Export | 4:30 Outro'),
    ('AI_Review', 'AI Will Change Video Editing FOREVER', '0:00 Intro | 0:30 Problem | 1:30 Demo | 4:00 Comparison | 6:00 Results | 7:30 Outro'),
    ('vs_Canva', 'Hostamar vs Canva for Bangla Content', '0:00 Intro | 0:30 Bangla test | 2:00 Templates | 4:00 Price | 6:00 Speed | 8:00 Winner'),
]
for name, title, script in yt_videos:
    with open(f'marketing-output/yt_{name}.txt', 'w', encoding='utf-8') as f:
        f.write(f'VIDEO: {title}\n\nSCRIPT:\n{script}\n\nTAGS: hostamar, bangladesh, AI video, editing')

# ============================================
# 5. SCHEDULE
# ============================================
schedule = '''WEEK 1 CONTENT CALENDAR
============================================================
MON 09:00 | Facebook  | P001 Launch
MON 10:00 | WhatsApp  | 7 groups (Msg 1)
TUE 09:00 | Facebook  | P002 Problem-Solution
TUE 11:00 | Email     | Welcome
WED 09:00 | Facebook  | P003 Benefits
WED 14:00 | YouTube   | Upload Video 1
THU 09:00 | Facebook  | P004 Social Proof
THU 10:00 | WhatsApp  | 7 groups (Msg 2)
FRI 09:00 | Facebook  | P005 Urgency
FRI 11:00 | Email     | Upgrade nudge
SAT 09:00 | Facebook  | P006 Tutorial
SAT 14:00 | YouTube   | Upload Video 2
SUN 09:00 | Facebook  | P007 Comparison
SUN 10:00 | WhatsApp  | 7 groups (Msg 3)
SUN 15:00 | Email     | Re-engage
'''
with open('marketing-output/SCHEDULE.txt', 'w', encoding='utf-8') as f:
    f.write(schedule)

# ============================================
# SUMMARY
# ============================================
fb = len([f for f in os.listdir('marketing-output') if f.startswith('fb_')])
wa = len([f for f in os.listdir('marketing-output') if f.startswith('wa_')])
em = len([f for f in os.listdir('marketing-output') if f.startswith('email_')])
yt = len([f for f in os.listdir('marketing-output') if f.startswith('yt_')])

print()
print('=' * 60)
print('HOSTAMAR MARKETING AUTOMATION COMPLETE')
print('=' * 60)
print(f'Facebook posts:   {fb}')
print(f'WhatsApp msgs:    {wa} (7 groups x 3)')
print(f'Email templates:  {em}')
print(f'YouTube scripts:  {yt}')
print(f'Calendar:         15 events / 7 days')
print(f'Target reach:     400K+')
print(f'Output: marketing-output/')
print(f'Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print('=' * 60)
print('Done! Ready to post.')