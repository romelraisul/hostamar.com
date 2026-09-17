#!/bin/bash
# playlist-guard.sh - Remove files with no audio stream from playlist
# Run before encoder start to ensure no silent files are broadcast
cd /home/romel/hostamar-build
PLAYLIST="docker/tv-station/videos/playlist.host.txt"
TEMP=$(mktemp)
COUNT_BEFORE=$(grep -c "^file " "$PLAYLIST")
grep "^file " "$PLAYLIST" | while read -r line; do
  f=$(echo "$line" | sed "s/^file '//;s/'$//")
  if ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$f" 2>/dev/null | grep -q .; then
    echo "$line" >> "$TEMP"
  else
    echo "GUARD: removing silent file: $(basename "$f")" >&2
  fi
done
mv "$TEMP" "$PLAYLIST"
COUNT_AFTER=$(grep -c "^file " "$PLAYLIST")
echo "Playlist: $COUNT_BEFORE -> $COUNT_AFTER files (removed $(($COUNT_BEFORE - $COUNT_AFTER)) silent)"
