#!/bin/bash
exec ffmpeg -re -stream_loop -1 -f concat -safe 0 \
  -i /home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt \
  -i /home/romel/hostamar-build/public/logo.png \
  -filter_complex \
  "[0:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p[base];\
  [1:v]scale=48:-1[wm];\
  [base][wm]overlay=W-w-6:6:format=yuv420,\
  drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='hostamar.com':fontsize=10:fontcolor=white:x=w-text_w-8:y=58[v];\
  [0:a]aresample=48000:async=1,loudnorm=I=-16:LRA=11:TP=-1.5[a]" \
  -map "[v]" -map "[a]" \
  -c:v libvpx-vp9 -row-mt 1 -deadline realtime -cpu-used 8 -b:v 400k -maxrate 430k -bufsize 860k \
  -c:a libopus -b:a 48k -ar 48000 \
  -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+omit_endlist+append_list \
  -hls_segment_type fmp4 \
  -hls_fmp4_init_filename init_v2.mp4 \
  -hls_segment_filename /home/romel/hostamar-build/docker/tv-station/hls2/seg%04d.mp4 \
  /home/romel/hostamar-build/docker/tv-station/hls2/master.m3u8
