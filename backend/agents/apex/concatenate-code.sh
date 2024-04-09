#!/bin/sh

ORIGINAL_PATH=$(pwd)

if [ "$#" -ne 2 ]; then
   echo "Usage: $0 source_directory temp_directory"
   exit 1
fi

SOURCE_DIR="$1"
TEMP_DIR="$2"

cd "$SOURCE_DIR"

echo "<codebase>\n" > "$TEMP_DIR/code.txt"
for x in `find . -type f | grep -v .git | grep -v node_modules | grep -v '~' | grep -v package-lock.json | grep -v package.json | grep -v png | grep -v ico | grep -v "backend/db.sqlite" | grep -v .mp3 | grep -v .ogg | grep -v uploads | grep -v .db | grep -v .svg | grep -v log.txt | grep -v 'python/dspy' | grep -v "agents/apex/code.txt"`
do
   echo "Processing $x"
   echo "<code filename=\"$x\">" >> "$TEMP_DIR/code.txt"
   cat $x >> "$TEMP_DIR/code.txt"
   echo "</code>" >> "$TEMP_DIR/code.txt"
done
echo "</codebase>" >> "$TEMP_DIR/code.txt"
find . -type f | grep -v .git | grep -v node_modules | grep -v '~' | grep -v package-lock.json | grep -v package.json | grep -v png | grep -v ico | grep -v "backend/db.sqlite" | grep -v .mp3 | grep -v .ogg | grep -v uploads | grep -v .db | grep -v .svg | grep -v log.txt | grep -v "code.txt"  | grep -v 'python/dspy' > "$TEMP_DIR/manifest.txt"

cd "$ORIGINAL_PATH"