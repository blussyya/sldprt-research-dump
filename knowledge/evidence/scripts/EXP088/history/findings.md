# Biography: draft findings for review

The Biography stream now has a sequential research reader. It reads all 216 Biography streams
found in the 222 local part-file paths, ending at exactly the last byte in each. That covers 3,519
records. Six paths have no Biography stream: plate4 and the five files in `not-a-part`.
These counts include controlled models, originals, online files and their archived re-exports;
they are not a count of distinct designs. `survey.json` records each path and result.

## Layout that was checked

All values below are little-endian. Strings use MFC CString lengths and encoding markers.
The reader does not search ahead for a boundary.

- An MFC class declaration for `moBiography_c`, then a u32 record count.
- Each record has nine u32 words, a CString and a u16.
- Then exactly two snapshots. Each has three u32 words followed by six path slots.
- Each path slot has a CString followed by three u32 words.

The parser keeps all these words. It does not replace unknown fields with a guessed meaning.

The first two record words match SolidWorks release and build-date codes in the independent
History stream for every record of C22, its C23 upgrade, native C24, head_back and the helical
gear. C23 preserves C22's first two records byte for byte and appends one record. Only the
outer record count changes from 2 to 3.

Reading the first two snapshot words together as Windows FILETIME gives plausible dates.
For all five checked files, one snapshot's whole-second value equals the first ModelStamps
word exactly. In head_back that is 2016-05-12 19:02:19 UTC, with the snapshot carrying an
additional 0.936120 seconds. This is a cross-check of the timestamp interpretation, not proof
that either snapshot specifically means opened, saved, rebuilt or redrawn.

The remaining header words resemble Windows environment data: architecture, processor count,
platform and OS version. The string is `Service Pack 1` in one head_back record, and the u16
values include familiar Windows language IDs. These meanings still need an independent check.
The three words after each path and the third snapshot word remain unnamed. Paths include
system folders, temporary folders, current directories and a template or document name.
Some later slots contain `*`; the reader preserves it rather than expanding an assumed delta.

## What this does and does not answer

Biography records environment and path/time snapshots. It does not provide a decoded feature
operation tree. SW2011's per-feature Created/Modified log is already read from `moHeader_c` in
Config-0 by EXP-081. The earlier suggestion that this log moved to Biography in SW2022 is not
supported by the records decoded here. Finding the modern feature log remains separate work.

In head_back, the four records and their two snapshots give more detail than a raw string scan,
but nothing decoded here identifies a graphics update, API save or batch job. Biography does
not yet explain why the display stamp stayed at 107.

## Checks

Run from the dump root:

```
node knowledge/evidence/scripts/EXP088/history/survey.js > knowledge/evidence/scripts/EXP088/history/survey.json
node knowledge/evidence/scripts/EXP088/history/check.js > knowledge/evidence/scripts/EXP088/history/check.json
```

The five-file checks compare release/build pairs with History, timestamps with ModelStamps,
and the preserved C22 records with C23. They also reject all 1,771 proper truncations of C22's
Biography, a trailing byte, an excessive count and a wrong class name: 1,774 rejected inputs.
These tests check framing and bounds; they do not establish the meanings of every field.
Independent challenge of the new layout is still pending.
