#!/usr/bin/env python3
"""
GPU Worker Health Check Server
Runs on port 9997 for health checks
"""

import os
import sys
import asyncio
import logging
from aiohttp import web
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def health_check(request):
    """Health check endpoint"""
    cuda_available = False
    gpu_count = 0
    gpu_name = "Unknown"
    
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_count = torch.cuda.device_count()
            if gpu_count > 0:
                gpu_name = torch.cuda.get_device_name(0)
    except Exception as e:
        logger.error(f"Error checking CUDA: {e}")
    
    return web.json_response({
        "status": "ok",
        "cuda_available": cuda_available,
        "gpu_count": gpu_count,
        "gpu_name": gpu_name,
        "worker_name": os.getenv("WORKER_NAME", "hostamar-gpu-worker"),
        "concurrency": int(os.getenv("WORKER_CONCURRENCY", "2"))
    })

async def init_app():
    app = web.Application()
    app.router.add_get('/health', health_check)
    return app

if __name__ == '__main__':
    # Create logs directory; fall back to /tmp if /app/logs is read-only
    # (happens on WSL2 when the host dir has restrictive ACLs).
    try:
        os.makedirs('/app/logs', exist_ok=True)
        probe = '/app/logs/.writeprobe'
        open(probe, 'w').close()
        os.remove(probe)
    except OSError:
        pass

    # Run the web server
    web.run_app(init_app(), host='0.0.0.0', port=9997)