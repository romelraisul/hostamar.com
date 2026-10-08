#!/bin/bash
# makeloop.sh — build ONE continuous loop file from the playlist.
#
# Why: `-f concat -stream_loop -1` re-opens the playlist every pass, and after
# one pass ffmpeg's concat demuxer + -re freeze the input thread ("Resumed
# reading ... after a lag of 40s") -> speed 0.81x, drops climb.
# Concatenating the members ONCE into a single file removes the demuxer from
# the live path entirely; from then on the encoder reads one flat file.
#
# Two-pass (2026-10-08): the concat demuxer cannot decode through audio param
# switches (playlist was 96x 24kHz/mono + 6x 48kHz/stereo + 1x 22.05kHz ->
# "channel layout rematrix" hard-exit 234 mid-concat). Members are
# audio-normalized FIRST (video stream-copied), then concat-copied.
# -nostdin everywhere: without it ffmpeg eats the member list from the
# while-loop's stdin and `read` resumes mid-line -> torn paths -> dropped
# members. Missing member = loud failure, never a silent drop.
set -e
cd /home/romel/hostamar-build/docker/tv-station/videos || exit 1
OUT=/home/romel/hostamar-build/docker/tv-station/videos/loop.mp4
NORM=/tmp/loopnorm
[ -s "$OUT" ] && { echo "loop.mp4 already exists ($(du -h $OUT | cut -f1)) — leaving it"; exit 0; }

rm -rf "$NORM"; mkdir -p "$NORM"
: > /tmp/looplist.txt
i=0
while IFS= read -r line; do
  f=$(echo "$line" | sed "s/^file '//;s/'\$//")
  case "$f" in
    /*) [ -f "$f" ] || { echo "MISSING member: $f"; exit 1; } ;;
  esac
  case "$f" in
    /*)
      i=$((i+1))
      n=$(printf "%s/m%03d.mp4" "$NORM" "$i")
      ffmpeg -nostdin -v error -y -i "$f" -map 0:v -map 0:a \
        -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 96k "$n"
      echo "file '$n'" >> /tmp/looplist.txt
      ;;
  esac
done < playlist.host.txt
echo "members: $i"

ffmpeg -nostdin -v warning -y -f concat -safe 0 -i /tmp/looplist.txt \
  -c:v copy -c:a copy "$OUT"
echo "built: $(du -h "$OUT" | cut -f1)"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"

# AUDIO GUARD: a loop that ships silent is dead air for every viewer.
# grep 'mean_volume:' FIRST (line-level) — grep -o on the raw ffmpeg output
# matches the first digit anywhere (e.g. the `0` in `volumedetect_0`) and a
# -32.1 dB healthy loop reported as "0 dB" (verified 2026-10-08).
mv=$(ffmpeg -nostdin -v info -i "$OUT" -t 120 -af volumedetect -f null - 2>&1 \
  | grep 'mean_volume:' | grep -oE '\-?[0-9.]+ dB' | head -1 | grep -oE '\-?[0-9.]+')
echo "mean_volume: $mv dB"
awk -v v="$mv" 'BEGIN{ if (v+0 > -50) exit 0; else { print "SILENT LOOP — refusing"; exit 1 } }'
