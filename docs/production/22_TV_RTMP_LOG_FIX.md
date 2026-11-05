# TV RTMP Log Spam Fix — syslog 2.8GB → zero
- Root cause: hostamar-tv-rtmp (nginx-rtmp) + hostamar-tv-streamer (ffmpeg) logging every video frame to stdout/stderr → journald → syslog 2.8GB/day
- Fix: docker-compose.yml logging.driver: "none" for both rtmp and streamer services
- Fix: streamer.sh ffmpeg command added -loglevel error flag
- Result: zero log output from these containers, syslog stable
- Guard won't resurrect with log spam (logging disabled at docker level)
