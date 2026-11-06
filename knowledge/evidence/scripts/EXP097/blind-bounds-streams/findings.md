# Blind check: per-face bounds tail (EXP-092) and duplicate streams (EXP-095)

Written by a blind Haiku agent on 2026-11-06 that didn't read EXP-092, EXP-095 or their scripts.
The agent couldn't save this file, so the parent session wrote it from the agent's report.

## Claim A, bounds tail: partly holds

- 13,589 records in 118 files, head words [0,0,1] on all, 8 combinations of the five tail
  words, 2,986 records with +104 = +108 = 1, all unit vectors (norms 0.9999999592 to
  1.0000000396), 2,406 of them on tag-4002 faces. All match.
- "Perpendicular to the cylinder axis" was checked against the display's own axis
  (metadata.direction): 2,406 of 2,406. Against the native B-rep axis it could only be checked
  on 740 of the 2,406 (740 of 740 within 2.83e-8, max 2.8205e-8). The other 1,664 have no native
  face with that ID in a body the dump's package reader could read, and 2 are native planes.
  The display axis and native axis disagree on 51 of 2,313 matched cylinders.
- The vector is the radial direction from the axis point to the record's box centre on 396 of
  740. A radial direction is perpendicular to the axis by construction, so perpendicularity
  alone doesn't say much about what the vector is.
- Controls: shuffled axes 1 of 740 pass, random vectors 0 of 14,800, other surface types 0.

## Claim B, duplicate streams: holds, with one count corrected

- 7,374 valid nonempty entries, 521 valid empty, 0 duplicate nonempty names. Same name sets as
  package/src/container/modern.js in every file.
- The corpus holds 178 modern containers, not 183. The parent session confirmed the 183 is every
  non-OLE2 path: it includes 5 files in `test files online/not-a-part/` (4 STEP text files
  starting "ISO-1030", 1 starting "nFJACwe0") that hold no entries.
- "zlib inflation" is raw DEFLATE. Zlib-wrapped inflation finds 0 entries.
- Controls: one-bit flips lost the entry in 60 of 60 files, planted headers in noise 0 valid,
  duplicate detector on doubled files 1,948 of 1,948 flagged.

Scripts: claim_a_check.js (--controls), claim_b_scan.py (run with python3 -I, --controls),
claim_b_reader_crosscheck.js, and the claim_a_*_probe.js scripts used while exploring.
