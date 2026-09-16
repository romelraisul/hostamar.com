#!/bin/bash
# makeloop.sh — build ONE continuous loop file from the playlist.
#
# Why: `-f concat -stream_loop -1` re-opens the playlist every pass, and after
# one pass (~780s of content, but the stall hits at 223s when a member boundary
# collides with re-read) ffmpeg's concat demuxer + -re freeze the input thread
# ("Resumed reading ... after a lag of 40s") -> speed 0.81x, drops climb.
#
# Concatenating the members ONCE into a single file removes the demuxer from
# the live path entirely; from then on the encoder reads one flat file.
# Stream copy: no re-encode, no quality loss, ~seconds of CPU.
set -e
cd /home/romel/hostamar-build/docker/tv-station/videos || exit 1
OUT=/home/romel/hostamar-build/docker/tv-station/videos/loop.mp4
[ -s "$OUT" ] && { echo "loop.mp4 already exists ($(du -h $OUT | cut -f1)) — leaving it"; exit 0; }

# build a concat list with absolute paths
: > /tmp/looplist.txt
while IFS= read -r line; do
  f=$(echo "$line" | sed "s/file '//;s/'//")
  case "$f" in /*) [ -f "$f" ] && echo "file '$f'" >> /tmp/looplist.txt;; esac
done < playlist.host.txt
echo "members: $(wc -l < /tmp/looplist.txt)"

# normalize audio (44.1k stereo) so the concat copy is seamless, video untouched
ffmpeg -v warning -y -f concat -safe 0 -i /tmp/looplist.txt \
  -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 96k "$OUT"
echo "built: $(du -h "$OUT" | cut -f1)"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
