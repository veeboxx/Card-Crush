#!/usr/bin/env bash
# Fetches the Tesseract.js WASM core files into public/tesseract-core/.
# Run once after cloning. The language data itself is downloaded by the app
# from a CDN on first OCR use and cached locally.
set -e

CORE_VERSION="5.1.1"
DEST="public/tesseract-core"
BASE="https://cdn.jsdelivr.net/npm/tesseract.js-core@${CORE_VERSION}"

mkdir -p "$DEST"
echo "Fetching Tesseract core files into $DEST ..."

for f in \
  tesseract-core.wasm.js \
  tesseract-core.wasm \
  tesseract-core-simd.wasm.js \
  tesseract-core-simd.wasm \
  tesseract-core-lstm.wasm.js \
  tesseract-core-simd-lstm.wasm.js \
  tesseract-core-simd-lstm.wasm
do
  echo "  - $f"
  curl -fsSL -o "$DEST/$f" "$BASE/$f"
done

echo "Done. ($(ls -1 "$DEST" | wc -l | tr -d ' ') files)"
