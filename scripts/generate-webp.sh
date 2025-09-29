#!/usr/bin/env bash
set -euo pipefail

# Generates .webp copies of all .jpg images under images/ preserving directory structure.
# Usage: bash scripts/generate-webp.sh

# Choose encoder: magick/convert (ImageMagick) or cwebp (libwebp)
if command -v magick >/dev/null 2>&1; then
  ENCODER="magick"
elif command -v convert >/dev/null 2>&1; then
  ENCODER="convert"
elif command -v cwebp >/dev/null 2>&1; then
  ENCODER="cwebp"
else
  echo "No image encoder found. Install ImageMagick (magick/convert) or cwebp (libwebp)." >&2
  exit 2
fi

echo "Using encoder: $ENCODER"

find images -type f -iname "*.jpg" -print0 | while IFS= read -r -d '' file; do
  out="${file%.*}.webp"
  echo "Processing: $file -> $out"
  if [ "$ENCODER" = "magick" ]; then
    magick "$file" -quality 80 "$out"
  elif [ "$ENCODER" = "convert" ]; then
    convert "$file" -quality 80 "$out"
  else
    # cwebp
    cwebp -q 80 "$file" -o "$out"
  fi
done

echo "Done. WebP files generated under images/"
