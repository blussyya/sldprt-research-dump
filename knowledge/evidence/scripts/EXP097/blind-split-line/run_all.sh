#!/usr/bin/env bash
# Runs the whole blind split-line pipeline. Usage: run_all.sh <scratch_dir>
# Inputs: /home/user/dump-validation/test files new/{SW2011,SW2022}/{C18_cube_split_line,C22_cube_sw2011_native,C24_cube_sw2022_native,C00_cube_10mm}/model.SLDPRT
set -euo pipefail
S="${1:?scratch dir}"
D="$(cd "$(dirname "$0")" && pwd)"
C="/home/user/dump-validation/test files new"
mkdir -p "$S"
for f in SW2011/C18_cube_split_line SW2011/C22_cube_sw2011_native SW2011/C00_cube_10mm SW2022/C18_cube_split_line SW2022/C24_cube_sw2022_native SW2022/C00_cube_10mm; do
  n=$(echo "$f" | tr '/' '_')
  python3 -I "$D/raw_streams.py" "$C/$f/model.SLDPRT" "$S/$n" > "$S/$n.manifest.txt"
  if [ -f "$S/$n/DisplayLists__ZLB.bin" ]; then
    python3 -I "$D/decode_zlb.py" "$S/$n/DisplayLists__ZLB.bin" "$S/$n/DisplayLists.bin"
  else
    cp "$S/$n/Contents_DisplayLists.bin" "$S/$n/DisplayLists.bin"
  fi
  python3 -I "$D/dlparse.py" "$S/$n/DisplayLists.bin" "$S/$n/faces.json" "$n"
done
python3 -I "$D/analyze.py" "$S" "$S/analysis.json"
python3 -I "$D/controls.py" "$S" "$S/controls.json" > "$S/controls.txt"
for f in SW2011/C18_cube_split_line SW2022/C18_cube_split_line; do
  n=$(echo "$f" | tr '/' '_')
  node "$D/package_link_crosscheck.js" /home/user/dump-validation/package/src/index.js "$C/$f/model.SLDPRT" "$n" > "$S/link_$n.json"
done
echo "done: $S"
