#!/bin/bash
# Runs 02-measure-file.js on each target and control file in parallel; outputs out-<id>.json
cd /home/user/dump-validation/knowledge/evidence/scripts/EXP097/blind-active-geometry
C=/home/user/dump-validation/test\ files\ online
run() { id=$1; f=$(find "/home/user/dump-validation/test files online" -iname "${id}*" | head -1); timeout 1500 node 02-measure-file.js "$f" > out-${id}.json 2> err-${id}.txt; echo "$id exit $?"; }
run 289756ce & run 629adcec & run 70477058 & run 516a7dc5 & run afc71d14 & run 03afebf4 & run c613782b &
wait
echo ALLDONE
