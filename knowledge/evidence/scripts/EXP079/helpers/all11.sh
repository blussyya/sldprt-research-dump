cd /home/claude/sldprt-research-dump/knowledge/evidence/scripts/EXP079
for d in ../../../../test\ files\ new/SW2011/C*/; do f="$d/model.SLDPRT"; [ -f "$f" ] || continue; echo "$(basename "$d" | cut -c1-24): $(node probe.js "$f" -q 2>&1 | grep -E '^STOP|^END' | cut -c1-120)"; done
