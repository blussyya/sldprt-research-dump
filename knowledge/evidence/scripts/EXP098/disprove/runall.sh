#!/bin/bash
cd /home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP098/disprove
node -e "const r=require('./survey.json').filter(x=>x.parts&&x.parts.length>1);console.log(r.map(x=>x.f).join('\n'))" | while read -r f; do
  b=$(basename "$f" | cut -c1-8)
  ( timeout 1500 node --max-old-space-size=4096 worker.js "$f" > out2/$b.json 2> out2/$b.err; echo "$b exit $?" >> out2/status.txt ) &
done
wait
