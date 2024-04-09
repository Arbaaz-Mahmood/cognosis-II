#!/bin/sh

for x in `find . | grep -v .git | grep -v node_modules | grep -v '~' | grep -v package-lock.json | grep -v package.json | grep -v png | grep -v ico | grep -v "backend/db.sqlite" | grep -v .mp3 | grep -v .ogg | grep -v uploads | grep -v .db | grep -v .svg | grep -v log.txt`
do
   echo "<code filename=\"$x\">"
   cat $x
   echo "</code>"
done | pbcopy
