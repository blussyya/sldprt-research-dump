#!/bin/bash
cd /home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP098/disprove
: > single.out
cat single.txt | xargs -P 6 -I{} sh -c 'timeout 600 node --max-old-space-size=3072 worker2.js "{}" >> single.out 2>/dev/null || echo "{\"f\":\"{}\",\"timeout\":true}" >> single.out'
echo done > single.done
