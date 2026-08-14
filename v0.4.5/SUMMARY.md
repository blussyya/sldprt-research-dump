# v0.4.5 Summary: EXP-023/024 Block1→Block2 Offset Correction

**Date:** 2026-08-13
**Objective:** Fix the Block1→Block2 offset bug identified by `v0.4.4/FALSIFICATION_REVIEW.md` in EXP-023 and EXP-024, and determine whether the previously reported `secCount=0`, `0 VALID candidates`, and `661/1,172 alternative-header correlation` results change once the offset is corrected. See `v0.4.5/CORRECTION_NOTE.md` for the full root-cause analysis.

This is a bug-fix rerun, not a new research direction. `v0.4.4/` files are untouched.

## Experiments

### EXP-023-CORRECTED: Alternative Header Characterization
- **Result:** Block2 header now valid for 1,172/1,172 faces (100%), vs. 0/1,172 before the fix.
- **Result:** `secCount` is no longer always 0. It matches an independent INV-009 cross-check (count of `ONE` values in the Block1 body) for 1,172/1,172 faces (100%).
- **Result:** 661/1,172 faces (56.4%) have alternative headers — **unchanged** from v0.4.4 (this detection logic never used the buggy offset).
- **New finding:** `secCount` and alternative-header presence correlate exactly, with zero exceptions across all 1,172 faces: `secCount=1` ⟺ has alternative with N=1 (368/368); `secCount=2` ⟺ has alternative with N=2 (293/293); `secCount>=3` ⟺ no alternative header (511/511).

### EXP-024-CORRECTED: Rejected Candidate Audit
- **Result:** VALID candidates: 1,172/4,688 (25.0%), vs. 0/4,688 before the fix.
- **Result:** 1,172 VALID exactly matches EXP-023-CORRECTED's 1,172 extracted faces and the established corpus face count for these 7 files (39+68+113+375+51+400+126=1,172). The EXP-023/EXP-024 contradiction flagged by the falsification review is resolved.
- **Result:** INV-016, INV-017, and INV-018 all pass 100% (1,172/1,172) once the real Block1/Block2 body data is used. 0 INV016_FAIL, 0 INV017_FAIL, 0 INV018_FAIL.
- **Result:** INVALID_EC (2,344) and INVALID_VC (1,172) category counts are unchanged from v0.4.4 (those pipeline stages are upstream of the fix and were never affected by it).

## Key Insights

1. The `secCount=0`, `0 VALID`, and "validation logic is too strict" claims from v0.4.4 were confirmed methodological artifacts, exactly as the falsification review predicted — not genuine findings about the file format.
2. Once corrected, EXP-023 and EXP-024 agree completely: 1,172 genuine faces, all satisfying INV-016/017/018.
3. This corroborates INV-005, INV-006, INV-008, INV-009, INV-016, INV-017, and INV-018 on a third, independently-written pipeline (EXP-023/024-corrected), on 1,172 faces across 7 files — overlapping with but not identical to the 1,234-face/8-file corpus used by EXP-016/017/018 (HEADPHONE is absent from this corpus; see Corpus note).
4. A new, exceptionless correlation was found between `secCount` and alternative-header presence/N-value. Per project rules, this is recorded as an **observed correlation only** — no semantic meaning is assigned to it or to the `[4,8,2,N]` alternative-header container.

## Facts

1. Block2 header valid at corrected offset: 1,172/1,172 faces (100%).
2. `secCount` distribution is no longer degenerate; values observed 1 through 1,044.
3. INV-009 cross-check (Block2 M == count of ONE in Block1 body): 1,172/1,172 match (100%).
4. EXP-024 VALID: 1,172/4,688 (25.0%), matching EXP-023's face count exactly.
5. INV-016/017/018 all pass 1,172/1,172 (100%) under the corrected pipeline.
6. secCount ⟺ alternative-header correlation: 0 exceptions across 1,172 faces (368 secCount=1/altN=1, 293 secCount=2/altN=2, 511 secCount>=3/no-alt).
7. 661/1,172 faces (56.4%) have alternative headers — unchanged from v0.4.4.
8. INVALID_EC (2,344) and INVALID_VC (1,172) counts unchanged from v0.4.4.

## Hypotheses (not elevated to conclusions)

1. The alternative `[4,8,2,N]` header's presence and N value may be structurally determined by `secCount` (or vice versa, or both driven by a third variable) — this is a correlation, not demonstrated causation. Untested against the 511-count-plus population beyond "no alternative observed."
2. Semantic meaning of `secCount>=3` faces lacking an alternative header is unknown.

## Falsified / Corrected Claims (superseding v0.4.4, without deleting it)

1. **"secCount=0 for ALL 1,172 faces" (EXP-023, v0.4.4)** — corrected. At the right offset, secCount is a well-formed, INV-009-consistent count for 100% of faces.
2. **"0 VALID candidates" (EXP-024, v0.4.4)** — corrected. 1,172/4,688 VALID once the same offset bug is fixed; this exactly matches EXP-023's face count, resolving the unacknowledged EXP-023/EXP-024 contradiction flagged by the falsification review.
3. **"Validation logic is too strict for raw data analysis" (EXP-024, v0.4.4)** — corrected. The falsification review's diagnosis is confirmed: the strictness was a pipeline bug, not an intrinsic property of the validation criteria. INV-016/017/018 were never the problem; they now execute and pass 100%.

## Claims Unaffected / Still Standing

1. Face and alternative-header counts (1,172 faces, 661 with alternatives, N=1:368/N=2:293) — unchanged, confirmed reproducible under the corrected pipeline.
2. "VC=4,8,10 faces always have alternatives" — still a structural correlation, still not demonstrated as causal (see OQ-014/OQ-016 discussion; unchanged by this fix).
3. EXP-022/025's classification bug and "generic serialization container" over-claim — out of scope for this correction; unaffected.
4. N=2 body[0]=3 (80.3%) semantics — unknown, unaffected by this fix.

## Unresolved / New Questions

1. What determines whether a face has `secCount<=2` (with a matching alternative header) versus `secCount>=3` (no alternative header)? Is `secCount` itself the deciding variable, or a shared cause with the alternative header?
2. Does the exceptionless secCount/alternative-header correlation hold on the 62 HEADPHONE faces excluded from this corpus? (OQ-017 already documents HEADPHONE's 0% alternative rate; this predicts, but does not yet confirm, that all 62 HEADPHONE faces would have secCount>=3.)
3. Does N (the alternative header's own length word) carry independent information beyond "mirrors secCount's value while secCount∈{1,2}", or is the alternative header entirely redundant with secCount?

## Files Created

- `v0.4.5/exp023_alternative_header_characterization_corrected.js`
- `v0.4.5/exp024_rejected_candidate_audit_corrected.js`
- `v0.4.5/EXP023_RESULTS_CORRECTED.json`
- `v0.4.5/EXP024_RESULTS_CORRECTED.json`
- `v0.4.5/CORRECTION_NOTE.md`
- `v0.4.5/SUMMARY.md` (this file)
- `knowledge/evidence/2026-08-13_v0.4.5-EXP023-corrected.md`
- `knowledge/evidence/2026-08-13_v0.4.5-EXP024-corrected.md`

No file under `v0.4.4/` or elsewhere was modified.
