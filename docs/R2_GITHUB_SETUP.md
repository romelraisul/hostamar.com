# R2 + GitHub TV Fallback Setup

This doc covers the GitHub Actions fallback that streams to YouTube/Facebook when the local PC (hostamar-gateway + ollama) is down. The live TV normally runs on your PC via `docker/tv-station` → HLS → YT/FB. When `api/tv/heartbeat` reports `pcAlive:false`, GitHub takes over using videos from R2.

## 1. Create R2 bucket

1. Cloudflare Dashboard → R2 → Create bucket `hostamar-tv`
2. Settings → R2 API → Create API Token with Object Read & Write on `hostamar-tv`, copy:
   - `R2_ACCOUNT_ID` (from dashboard URL or `r2.cloudflarestorage.com` account id)
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
3. Bucket → Settings → Public access → Allow or connect custom domain → copy `R2_PUBLIC_URL` e.g. `https://pub-xxx.r2.dev` or `https://tv-r2.hostamar.com`
4. Bucket → CORS if needed for HLS.

## 2. Upload videos to R2

```bash
pip install boto3
export R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET=hostamar-tv R2_PUBLIC_URL=https://pub-xxx.r2.dev
python scripts/tv/r2_upload.py public/tv/*.mp4
# or dry-run
python scripts/tv/r2_upload.py --dry-run
```

Verify: `curl https://hostamar.com/api/tv/r2 | jq .` should list `videos[]` with `r2PublicUrl`.

## 3. Set GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- `TV_HEARTBEAT_URL` = `https://hostamar.com/api/tv/heartbeat` (or `https://ai.hostamar.com/api/tv/heartbeat`)
- `YT_RTMP_URL` = `rtmp://a.rtmp.youtube.com/live2/YOUR_KEY` (full URL with key)
- `FB_RTMP_URL` = `rtmps://live-api-s.facebook.com:443/rtmp/YOUR_KEY` (optional, same)

## 4. Enable workflow

`.github/workflows/tv-fallback.yml` runs every 15 min (`*/15 * * * *`) and on manual dispatch.

- It fetches `TV_HEARTBEAT_URL`, checks `pcAlive`.
- If `pcAlive==true`, it exits (no stream).
- If `false`, it installs ffmpeg and runs `ffmpeg -re -i <R2 video> -c:v libx264 -b:v 800k -c:a aac -f flv $YT_RTMP_URL -f flv $FB_RTMP_URL`

Test manually: Actions → TV Fallback → Run workflow.

## 5. Configure Vercel env for ai.hostamar.com bypass

Vercel Dashboard → hostamar-build → Settings → Environment Variables (Production):

- `LITELLM_MASTER_KEY` (same as in `/home/romel/hostamar-build/.env`)
- `OPENROUTER_API_KEY` / `TOKENROUTER_API_KEY` etc. if you want Vercel to proxy 1M models
- `R2_PUBLIC_URL`, `TV_HLS_URL`

Then `vercel --prod` to redeploy. After, `curl https://ai.hostamar.com/api/tv/heartbeat | jq .` and `curl https://ai.hostamar.com/api/tv/r2 | jq .` must both succeed.

## 6. Verification checklist

```bash
# Heartbeat: should return pcAlive boolean and staleSeconds
curl -s https://hostamar.com/api/tv/heartbeat | jq .
curl -s https://ai.hostamar.com/api/tv/heartbeat | jq .
curl -s http://localhost:3000/api/tv/heartbeat | jq .

# R2 list: should return videos with R2_PUBLIC_URL
curl -s https://hostamar.com/api/tv/r2 | jq .
curl -s http://localhost:3000/api/tv/r2 | jq .

# HLS playlist must contain #EXTINF
curl -s https://tv.hostamar.com/hls/live/tv/index.m3u8 | head -20 | grep EXTINF

# Gateway 95 models
curl -s http://127.0.0.1:4000/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY" | jq length
# must be 95, first kimi-k3, last hostamar-own
```

## 7. Local dev

```bash
npm run dev
curl http://localhost:3000/api/tv/heartbeat | jq .
curl http://localhost:3000/api/tv/r2 | jq .
```

If `pcAlive` is false on prod but true locally, your PC's HLS tunnel is down — check `cloudflared tunnel` and `docker logs hostamar-gateway`.

## 8. Rotate keys

If `OPENROUTER_API_KEY` was corrupted, rotate in OpenRouter dashboard, update Vercel env and `/home/romel/hostamar-build/.env`, then `docker restart hostamar-gateway`.
