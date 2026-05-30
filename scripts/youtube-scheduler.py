#!/usr/bin/env python3
"""HOSTAMAR YOUTUBE SCHEDULER - Auto-generate video descriptions & schedule"""
import os, json

BASE = "/mnt/c/Users/romel/hostamar-local"
YT_DIR = f"{BASE}/marketing-output/youtube"
os.makedirs(YT_DIR, exist_ok=True)

VIDEOS = [
    {
        "id": "yt1",
        "title": "How to Make a Video in 5 Minutes | Hostamar Tutorial",
        "description": """Learn how to create professional videos in just 5 minutes using Hostamar! 

In this tutorial, I show you step-by-step how to use Hostamar's AI video generation platform to create stunning videos without any editing experience.

🔗 Try FREE: https://hostamar.com
🎁 First 100 users: 50% OFF

Timestamps:
0:00 Introduction
0:30 What is Hostamar
1:15 Creating your first video
3:00 Adding Bangla text & music
4:00 Export in 1080p HD
4:30 Pricing & Plans

#VideoEditing #AIVideo #Bangladesh #Hostamar #ContentCreation""",
        "tags": "video editing, AI video, bangladesh, tutorial, hostamar, content creation, video maker",
        "category": "Howto & Style",
        "default_lang": "bn",
        "thumbnails": {"1280x720": "yt1-thumb-1280.jpg", "640x480": "yt1-thumb-640.jpg"}
    },
    {
        "id": "yt2",
        "title": "AI Will Change Video Editing FOREVER | Hostamar Review",
        "description": """AI is revolutionizing video creation! In this video, I review Hostamar - an AI-powered video generation tool designed specifically for Bangladesh creators.

Watch as I create multiple videos in real-time!

📊 Results:
- Created 5 videos in 25 minutes
- Cost: ৳2,000/month (vs ৳15,000+ for traditional editing)
- Quality: 1080p HD

🔗 Try it: https://hostamar.com

#AI #VideoEditing #BangladeshCreators #Hostamar""",
        "tags": "ai video, video editing, bangladesh, review, hostamar, technology, ai editing",
        "category": "Science & Technology",
        "default_lang": "bn"
    },
    {
        "id": "yt3",
        "title": "Hostamar vs Canva Video | Which is Better for Bangla Content?",
        "description": """Hostamar vs Canva - the ultimate comparison for Bangladesh content creators!

I tested both platforms for creating Bangla video content:

Category | Hostamar | Canva
Bangla Text | ✅ Full support | ❌ Limited
Templates | 50+ (BD focused) | 100+ (Global)
Price | ৳2,000/mo | $12.99/mo
Speed | 5 min/video | 15 min/video
Export | 1080p HD | 720p (free)

🎯 Winner for BD creators: HOSTAMAR!

#Hostamar #Canva #BanglaContent""",
        "tags": "hostamar, canva, comparison, bangladesh, video editing, bangla content",
        "category": "Howto & Style",
        "default_lang": "bn"
    }
]

# Upload schedule
SCHEDULE = """🇧🇩 YOUTUBE UPLOAD SCHEDULE (Week 1)
=========================================
Wednesday 14:00 → Upload Video 1: {title_1}
Saturday   14:00 → Upload Video 2: {title_2}
Wednesday (Week 2) 14:00 → Upload Video 3: {title_3}
=========================================
Tips:
- Upload between 2-4 PM BD time for max views
- Share to Facebook groups immediately after upload
- Pin to channel homepage
- Add end screen with Subscribe button
""".format(title_1=VIDEOS[0]['title'], title_2=VIDEOS[1]['title'], title_3=VIDEOS[2]['title'])

# Save video metadata
with open(f"{YT_DIR}/video-metadata.json", 'w', encoding='utf-8') as f:
    json.dump(VIDEOS, f, indent=2, ensure_ascii=False)

# Save schedule
with open(f"{YT_DIR}/upload-schedule.txt", 'w', encoding='utf-8') as f:
    f.write(SCHEDULE)

# YouTube API upload script (for automation)
UPLOAD_SCRIPT = '''#!/usr/bin/env python3
"""Upload to YouTube using google-api-python-client"""
import os
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

def upload_video(title, description, tags, category, file_path):
    os.chdir("/mnt/c/Users/romel/hostamar-local")
    flow = InstalledAppFlow.from_client_secrets_file("client_secret.json", SCOPES)
    credentials = flow.run_console()  # Or run_local_server()
    youtube = build("youtube", "v3", credentials=credentials)
    
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags.split(", "),
            "categoryId": category
        },
        "status": {"privacyStatus": "public"}
    }
    
    media = MediaFileUpload(file_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = request.execute()
    print(f"Uploaded: https://youtube.com/watch?v={response['id']}")
    return response

if __name__ == "__main__":
    import sys
    # Usage: python3 upload-youtube.py "video.mp4" "title" "desc" "tags" "22"
    upload_video(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[1])
'''

with open(f"{BASE}/scripts/upload-youtube.py", 'w') as f:
    f.write(UPLOAD_SCRIPT)

# Write full upload-ready descriptions
for v in VIDEOS:
    with open(f"{YT_DIR}/ready-{v['id']}.txt", 'w', encoding='utf-8') as f:
        f.write(f"TITLE: {v['title']}\n\n")
        f.write(f"DESCRIPTION:\n{v['description']}\n\n")
        f.write(f"TAGS: {v['tags']}\n")
        f.write(f"CATEGORY: {v.get('category', 'People & Blogs')}\n")
        f.write(f"LANGUAGE: {v.get('default_lang', 'en')}\n")

print("✅ YouTube scheduler built:")
print(f"   {YT_DIR}/video-metadata.json  → Video metadata")
print(f"   {YT_DIR}/upload-schedule.txt → Upload schedule")
print(f"   {YT_DIR}/ready-yt1.txt       → Video 1 description")
print(f"   {YT_DIR}/ready-yt2.txt       → Video 2 description")
print(f"   {YT_DIR}/ready-yt3.txt       → Video 3 description")
print(f"   scripts/upload-youtube.py    → Auto-upload script")
print(f"\n{SCHEDULE}")