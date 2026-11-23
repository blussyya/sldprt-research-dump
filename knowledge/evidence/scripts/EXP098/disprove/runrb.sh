#!/bin/bash
cd /home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP098/disprove
: > rb.out
node -e "console.log(require('./survey.json').filter(x=>x.parts&&x.parts.length>1).map(x=>x.f).join('\n'))" | tail -n +2 | while read -r f; do
 ( timeout 900 node --max-old-space-size=3072 rb.js "$f" >> rb.out 2>&1 || echo "$(basename "$f") TIMEOUT/ERR" >> rb.out ) &
done; wait; echo done > rb.done
