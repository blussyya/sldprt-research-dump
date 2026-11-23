#!/bin/bash
cd /home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP098/disprove
cat single_rest.txt | xargs -d '\n' -P 4 -I{} sh -c 'timeout 300 node --max-old-space-size=3072 worker2.js "$1" >> single2.out 2>/dev/null || echo "{\"f\":\"$1\",\"timeout\":true}" >> single2.out' _ {}
echo done > single2.done
