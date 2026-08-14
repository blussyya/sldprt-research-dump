# v0.4.5 Correction Note: EXP-023/024 Block1→Block2 Offset Bug

**Date:** 2026-08-13
**Scope:** Corrects the Block1→Block2 offset bug identified in `v0.4.4/FALSIFICATION_REVIEW.md` for EXP-023 (`v0.4.4/exp023_alternative_header_characterization.js`) and EXP-024 (`v0.4.4/exp024_rejected_candidate_audit.js`).
**Nature of this document:** Bug-fix rerun of two existing experiments. **Not a new hypothesis, not a redesign of the research.** No file under `v0.4.4/` was modified. All original scripts, results, and evidence remain exactly as they were.

---

## 1. Root cause (confirmed, more precise than the original diagnosis)

The v0.4.4 falsification review suspected the bug was "B2 read at `block1Start + b1Word0 * 4` instead of `block1Start + 8 + b1Word0 * 4`" — i.e. a missing partial header offset, with `b1Word0` assumed to already be a legitimate Block1 body length.

Direct inspection of `v0.4.4/EXP023_RESULTS.json` shows this assumption was itself wrong:

```
distinct b1Len values across 1,172 faces: [4]
```

`b1Len` (== `b1Word0`) is **always exactly 4**, for every single face. This is because the original code read:

```js
const b1Word0 = dlBuf.readUInt32LE(block1Start);       // = 4, always (the header's constant tag word)
const b1Word1 = dlBuf.readUInt32LE(block1Start + 4);   // = 8, always (the header's constant tag word)
```

Per **INV-005** (`knowledge/KNOWN_INVARIANTS.md`), Block1's true layout is:

```
block1Start + 0  -> 4   (constant)
block1Start + 4  -> 8   (constant)
block1Start + 8  -> 2   (constant)
block1Start + 12 -> N   (the actual body length)
block1Start + 16 -> N u32 body words
```

The original code never read `block1Start + 12`. It read the header's first constant word and mislabeled it `b1Word0`/`b1Len`, then computed:

```js
block1Start + b1Word0 * 4  =  block1Start + 4*4  =  block1Start + 16
```

Because `b1Word0` was always `4`, this expression always evaluated to `block1Start + 16` — which is **the start of Block1's own body**, not Block2. The scripts were reading (and mislabeling as "B2") the same Block1 body data whose first word (per INV-008) is `1`. That is consistent with the falsification review's own byte-level observation ("first B2 value is always `1`, remaining values include large numbers (500+) that are clearly B1 index data").

## 2. The corrected formula (per the established, already-proven layout)

```
Block1: [4, 8, 2, N]        // 16-byte header
        [N u32 body values]

Block2 starts at: block1Start + (N + 4) * 4
```

where `N` is read from `block1Start + 12` **after** validating the header shape `[4, 8, 2, N]` at `block1Start + 0..8`. This is exactly the formula already used and validated by `v0.4.3/exp018_independent_extraction.js` and `v0.4.3/exp021_alternative_headers.js` (both already part of this repo's established, non-falsified evidence base). No new offset model was invented for this correction — it is a straight application of INV-005 that the original EXP-023/024 scripts simply never performed.

## 3. What changed in the corrected scripts

- `v0.4.5/exp023_alternative_header_characterization_corrected.js`
- `v0.4.5/exp024_rejected_candidate_audit_corrected.js`

Both scripts are otherwise line-for-line faithful to their v0.4.4 originals (same corpus list, same face-extraction preconditions, same alternative-header search at mp-20/mp-24, same category names where unaffected). Changes:

1. Read the full 4-word Block1 header and validate its shape `[4,8,2,N]` (previously: read 2 words, no shape validation, first word mislabeled as length).
2. Compute `block2Start = block1Start + (N + 4) * 4` using the correctly-read `N` (previously: `block1Start + b1Word0 * 4` using the misread constant).
3. Read and validate the real Block2 header `[4,8,2,M]` at `block2Start` per INV-006 (previously: an ad hoc loop scanning `b1Word0` words for values in `[1,500]`, which was actually rescanning Block1's own body).
4. In EXP-024, INV-016/017/018 are checked against the real Block1 body and real Block2 body (previously: INV-017's check was literally a range check comment-labeled "Simplified check: just ensure sectionLen is reasonable" — it did not test INV-017 at all, and was unreachable anyway because 100% of candidates failed at the B2 stage first).
5. `RESEARCH_DIR` was changed from a hardcoded Windows path to `path.resolve(__dirname, '..')` — a portability fix required to run the scripts in this environment, orthogonal to the substantive correction.

One bug was introduced and then fixed during this work: an initial version of the EXP-024 INV-017 section-splitting logic required the Block1 body to end exactly on a trailing `ONE`, which is essentially never true (the last ONE-delimited section has no trailing delimiter). This was corrected to match the already-validated splitting algorithm in `v0.4.2a/audit_v042a.js` (push the trailing partial section too). See inline script comments; this is disclosed for transparency and does not affect any published v0.4.4 evidence.

## 4. Corpus note

Same 8-file `FILES` list as the original EXP-023/024 (`BOTTOM, TOP, GEAR, DEKOR, SW2000-s01, DISTRIBUTOR, POCKET, PTC`). `SW2000-s01.SLDPRT` still yields no DisplayLists (OLE2 format, unsupported by this pipeline — unchanged from v0.4.4). `HEADPHONE` (62 faces) is not present in this repository checkout (it lives outside the `test files original/` tree referenced by these scripts) and remains excluded, exactly as it was in the original v0.4.4 EXP-023/024 runs. Corrected corpus: **1,172 faces across 7 files** — identical face count to the original v0.4.4 EXP-023/024 runs, since face extraction (through the gap-marker check) is untouched by this fix.

See `knowledge/evidence/2026-08-13_v0.4.5-EXP023-corrected.md` and `knowledge/evidence/2026-08-13_v0.4.5-EXP024-corrected.md` for full results and the observed/hypothesis/falsified/unresolved breakdown.
