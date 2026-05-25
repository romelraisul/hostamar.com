#!/usr/bin/env python3
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
