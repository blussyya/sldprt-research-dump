#!/bin/bash
cd /home/user/dump-validation/knowledge/evidence/scripts/EXP103
for c in /home/user/solidworks-converters; do
 for f in "/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt" "/home/user/sldprt-research-dump/test files online/2025/f0b9a118_Standoff_M3x0.5_37 mm_Male to Female.SLDPRT" "/home/user/sldprt-research-dump/test files online/2022/db8a97e2_écrou fileté M5.SLDPRT"; do
  echo "== $(basename "$f")"; CONV=$c node measure.js "$f" 2>&1 | tail -8
 done
done
