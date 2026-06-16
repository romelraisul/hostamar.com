#!/usr/bin/env python3
"""
Test job enqueuer — pushes a fake 'video-generation' job onto the Redis
queue so we can verify the python GPU worker consumes + calls back to the
Node app end-to-end.

Run via: docker exec hostamar-app python3 /tmp/enqueue-test.py
(uses the app container because it has both Node + Python env, but really
any container with bullmq-py + network access to Redis works.)

Or run locally if you have bullmq-py installed:
    python3 scripts/enqueue-test-job.py
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

from bullmq import Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_NAME = os.getenv("VIDEO_QUEUE_NAME", "video-generation")


async def main():
    queue = Queue(QUEUE_NAME, {"connection": REDIS_URL})

    # If a videoId is provided via args, use it; otherwise generate one.
    # The Python worker expects at minimum: videoId, prompt. (provider/style/etc optional)
    video_id = sys.argv[1] if len(sys.argv) > 1 else f"test-{int(datetime.now(timezone.utc).timestamp())}"
    prompt = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "a cinematic shot of Dhaka at sunset in Bengali style"

    payload = {
        "videoId": video_id,
        "prompt": prompt,
        "style": "cinematic",
        "duration": 5,
        "aspectRatio": "16:9",
        "userId": "test-user",
        "priority": 0,
    }
    job = await queue.add("generate", payload)
    print("enqueued job:")
    print(json.dumps({
        "jobId": job.id,
        "videoId": video_id,
        "queue": QUEUE_NAME,
        "payload": payload,
    }, indent=2))
    await queue.close()


if __name__ == "__main__":
    asyncio.run(main())
