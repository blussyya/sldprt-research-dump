#!/bin/bash
# one node process at a time over the online sample and the SW2022 controlled models
cd "$(dirname "$0")"
: > corpus.jsonl
find "/home/user/sldprt-research-dump/test files online" "/home/user/sldprt-research-dump/test files new/SW2022" -iname '*.sldprt' | sort | while read -r f; do
  s=$(stat -c %s "$f")
  if [ "$s" -gt 40000000 ]; then echo "{\"file\":\"$f\",\"skipped\":\"size $s\"}" >> corpus.jsonl; continue; fi
  timeout 300 node --max-old-space-size=3000 check.js "$f" 2>/dev/null | tail -1 >> corpus.jsonl || echo "{\"file\":\"$f\",\"error\":\"timeout or crash\"}" >> corpus.jsonl
done
