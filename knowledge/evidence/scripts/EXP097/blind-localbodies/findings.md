# Blind check: LocalBodies framing, headers and flag (EXP-091, EXP-092, EXP-096)

Written by a blind Haiku agent on 2026-11-06 with its own OLE2 reader, modern-container scanner
and grammar parser. It didn't read EXP-091, 092 or 096. The agent couldn't save this file, so
the parent session wrote it from the agent's report.

## Framing and counts: hold

41 LocalBodies streams in 40 files (`d0d61cde` has Config-0 and Config-1). All 41 parse to
exactly their end. 281 entries, 289 sections, all ending in 8 zero bytes. Two sections are
multi-chunk (48 and 205 chunks; first chunk 1,048,576 bytes inflated, then 4,096), as EXP-091
already says.

## Headers: hold

117 ten-byte and 164 eighteen-byte headers, with every zero byte, size + 5 link and section
count checked. The 8 between-section records are flag 0 with the right size + 5. No ten-byte
entry has more than one section, so that case isn't exercised.

## Flag: counts hold, value not independently checked

Flag 1 in 8 entries, 0 in 273. By a string search, BODY_IN_LIGHTWEIGHT_PERM is absent in 8
flag-0 entries and present in the other 265 flag-0 and all 8 flag-1 entries. The agent didn't
decode the attribute's value, so "flag 1 exactly when the value is 0" still rests on the
original reader only.

## Controls

34 of 34 as expected: synthetic round trip; 14 mutations rejected (truncation, shifts, counts,
GUID, tail, zlib byte, section count, between-record flag); a flipped flag and a renamed entry
accepted (the grammar can't see those, as expected); 8 mutations each rejected on all 41 real
streams.

Scripts, in run order: extract_localbodies.py, run_all_localbodies.py, report_numbers.py,
controls.py. Readers: cfb.py, modern.py. survey_magic.py and survey_names.py were exploration.
The extracted raw streams were kept in the session scratchpad, not here.
