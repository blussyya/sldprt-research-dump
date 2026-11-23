#!/bin/bash
# Run deflate_scan (MINOUT=1) on every modern file in inventory.json; one file at a time.
HERE=/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP112/disprove2
mkdir -p "$HERE/deflate_hits"
python3 - <<'PY' > "$HERE/deflate_hits/index.tsv"
import json
for i, r in enumerate(json.load(open('/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP112/disprove2/inventory.json'))):
    if r['kind'] == 'modern' and r['head8'][8:] == '00000004':
        print(f"{i:03d}\t{r['path']}")
PY
while IFS=$'\t' read -r id path; do
  "$HERE/deflate_scan" "$path" 1 > "$HERE/deflate_hits/$id.txt" 2>> "$HERE/deflate_hits/log.txt"
done < "$HERE/deflate_hits/index.tsv"
echo done >> "$HERE/deflate_hits/log.txt"
