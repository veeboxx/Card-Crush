#!/usr/bin/env bash
# Regenerates src-tauri/icons/icon.icns from public/icon-512.png (macOS only).
set -e

SRC="public/icon-512.png"
SET="src-tauri/icons/icon.iconset"

if [ ! -f "$SRC" ]; then
  echo "Error: $SRC not found." >&2
  exit 1
fi

mkdir -p "$SET"
sips -z 16 16     "$SRC" --out "$SET/icon_16x16.png"      >/dev/null
sips -z 32 32     "$SRC" --out "$SET/icon_16x16@2x.png"   >/dev/null
sips -z 32 32     "$SRC" --out "$SET/icon_32x32.png"      >/dev/null
sips -z 64 64     "$SRC" --out "$SET/icon_32x32@2x.png"   >/dev/null
sips -z 128 128   "$SRC" --out "$SET/icon_128x128.png"    >/dev/null
sips -z 256 256   "$SRC" --out "$SET/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$SRC" --out "$SET/icon_256x256.png"    >/dev/null
sips -z 512 512   "$SRC" --out "$SET/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$SRC" --out "$SET/icon_512x512.png"    >/dev/null
cp "$SRC" "$SET/icon_512x512@2x.png"

iconutil -c icns "$SET" -o src-tauri/icons/icon.icns
echo "Wrote src-tauri/icons/icon.icns"
