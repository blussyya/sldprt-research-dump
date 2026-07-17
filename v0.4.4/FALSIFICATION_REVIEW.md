# v0.4.4 Falsification Review — EXP-022 to EXP-025

**Reviewer:** Project Falsification Agent
**Date:** 2026-07-16
**Version:** v0.4.4
**Scope:** Scripts and evidence files at `v0.4.4/exp02[2-5]_*.js` and `knowledge/evidence/2026-07-16_v0.4.4-EXP02[2-5].md` and `v0.4.4/SUMMARY.md`

---

## Per-Experiment Review

### EXP-022: Global Container Survey

**Evidence file:** `knowledge/evidence/2026-07-16_v0.4.4-EXP022.md`
**Script:** `v0.4.4/exp022_global_container_survey.js`
**Results:** `v0.4.4/EXP022_RESULTS.json`

#### What It Claims

1. 3,516 [4,8,2,N] patterns found across 7 files (0.96 per 1KB)
2. N values range from 1 to 9,636 (173 distinct values)
3. Body lengths range from 24 to 727,940 bytes
4. All patterns classified as UNKNOWN (not associated with face markers)
5. Hypothesis H1: Pattern is a generic serialization container (Medium confidence)

#### What It Actually Does

Scans the entire DisplayLists stream looking for [4,8,2,N] (three consecutive u32 LE reads: 4, 8, 2, then N). Measures "body length" by searching forward to the next [4,8,2,N] pattern. Attempts classification based on preceding/following bytes at fixed offsets.

#### Verification

Counts reproducible: **Confirmed** (3,516 patterns, per-file counts match).

#### FLAWS

**1. Classification logic is structurally incapable of succeeding (Critical)**

The code classifies a [4,8,2,N] pattern as FACE_B1 if `followBytes[0] === 12 && followBytes[1] === 100 && followBytes[2] === 2`. Where `followBytes` are read at offsets i+16, i+20, i+24 from the pattern start.

For a face-container [4,8,2,N] at position `i = mp - 16 - 4*N`:
- `i + 16 = mp - 4*N`
- For N=1: i+16 = mp-4 = edgeCount (NOT 12)
- For N=2: i+16 = mp-8 = body[0] (NOT 12)

FACE_HEADER checks `precedBytes[3] === 12 && precedBytes[2] === 100 && precedBytes[1] === 2` at i-4, i-8, i-12. For face containers, i-4 = mp-20-4*N, which is nowhere near a face marker.

**Result: Both classification branches are guaranteed to never match for any face-container [4,8,2,N] pattern. The 100% UNKNOWN rate is a foregone conclusion of buggy code, not a meaningful experimental result.**

No other classification rules fire because SMALL_CONTAINER (lines 190-195) requires n===1 bodyLen<=8 or n===2 bodyLen<=16. But bodyLen in EXP-022 is the SPACING to the next [4,8,2,N], not the container body. For face containers, bodyLen=132 (measured for BOTTOM), so this rule never fires.

**2. "Body length" is inter-container spacing, not container body size (Misleading)**

The code computes bodyLen as:
```javascript
for (let j = i + 16; j <= dlBuf.length - 16; j += 4) {
  if (dlBuf.readUInt32LE(j) === 4 && ... === 8 && ... === 2) {
    bodyLen = j - (i + 16);  // distance to NEXT [4,8,2,N]
  }
}
```

This measures the distance between the end of one [4,8,2,N] header and the start of the next one. For face containers at BOTTOM, the actual body is 4 bytes (N=1), but EXP-022 reports 132 bytes — the gap between two face containers.

**The reported "min 24, max 727,940, avg 2,121" values are all inter-container spacing, not container body sizes. This is misleading at best.**

#### Verdict: Weakened / Methodology Flawed

- Pattern count (3,516) is correct and reproducible
- N distribution is correct and reproducible
- **Classification is meaningless** — broken code guarantees 100% UNKNOWN
- **"Body length" metric is mislabeled** — it measures spacing, not body size
- **Evidence overstated significance** — claims "patterns are not exclusively associated with face markers" when the code couldn't detect that association even if it existed

---

### EXP-023: Alternative Header Characterization

**Evidence file:** `knowledge/evidence/2026-07-16_v0.4.4-EXP023.md`
**Script:** `v0.4.4/exp023_alternative_header_characterization.js`
**Results:** `v0.4.4/EXP023_RESULTS.json`

#### What It Claims

1. 661/1,172 faces (56.4%) have alternative headers
2. VC=4,8,10 faces ALWAYS have alternatives (100% rate)
3. N=1 correlates with EC=4
4. Hypothesis H1: Alternative header depends on vertexCount

#### What It Actually Does

Extracts faces using EXP-018 pipeline (ec, vc, vertices, gap validation). Checks mp-20 for [4,8,2,1] (N=1) and mp-24 for [4,8,2,2] (N=2). Computes sectionCount by reading "B2" values at `block1Start + b1Word0 * 4`.

#### Verification

Face counts reproducible: **Confirmed** (1,172 faces, 661 with alternatives, per-file counts match).
N=1 and N=2 counts: **Confirmed** (368 N=1, 293 N=2).

#### FLAWS

**1. Only checks for N=1 and N=2 (Limitation)**

The code hardcodes mp-20 (N=1) and mp-24 (N=2). If N=3+ alternatives exist (e.g., at mp-28 for N=3), they are invisible. The evidence does not acknowledge this limitation.

**2. "Section count" data is unreliable (Data Quality)**

The section count computation reads B2 at `block1Start + b1Word0 * 4`. This offset is the start of B1 body data (after the 4-byte length header), not the start of B2. The actual B2 offset should include the B1 body and potentially the 8-byte header.

Byte-level inspection of BOTTOM and GEAR faces shows:
- Formula A (used by EXP-023): first B2 value is always `1`, remaining values include large numbers (500+) that are clearly B1 index data
- None of the three plausible offset formulas produce clean section-length data
- The "B2 area" at any offset is a mix of section-length-like values and index-like values

Result: secCount in EXP-023's per-face data is always 0 (because all faces have at least one out-of-range value). The section count correlation tables in the evidence are therefore **meaningless** — they show all faces with secCount=0 or 1 depending on whether the first read value happened to be in [1,500].

**3. "100% alt rate for VC=4,8,10" is correlation, not causation (Overinterpretation)**

The evidence states "VC=4 faces ALWAYS have alternatives (100% rate)" and implies the alternative header depends on vertexCount. This is a structural correlation, not a demonstrated causal relationship. Alternative explanations:
- VC=4 faces are all triangle/quad faces (specific geometry type requires the container)
- Alternative header is determined by edgeCount, which correlates with VC (EC=4 faces always have VC=4)
- The relationship is coincidental — a third variable causes both

**4. Section count correlation tables are either wrong or unverifiable (Data Integrity)**

Verification shows secCount=0 for ALL 1,172 faces in `EXP023_RESULTS.json`. This means the "Correlation with section count" table in the evidence document — which shows `Sec | With Alt | Without Alt` with values ranging from 1 to 10 — cannot be derived from the published result data.

Either:
- The table was generated from a different dataset not saved to `EXP023_RESULTS.json`
- The table uses a different definition of "section count" not reflected in the code
- The table is wrong

**This is a data integrity issue.** The evidence claims a correlation that the supporting data cannot reproduce.

**5. Corpus excludes HEADPHONE (Documentation gap)**

The script includes SW2000-s01 but excludes HEADPHONE (which is in the "untouched" directory, not TEST_DIR). EXP-021 and EXP-018 included HEADPHONE and had 1,234 faces. EXP-023 has 1,172 faces (missing HEADPHONE's 62). **This discrepancy is not noted in the evidence.**

#### Verdict: Partially Reliable

- Face and alternative counts are reproducible and reliable
- Section count data is unreliable (B2 offset bug)
- "VC=4,8,10 always have alternatives" is a structural correlation, not tested causation
- N=1/N=2 correlation with EC is real but not tested for N>2 alternatives
- Missing HEADPHONE corpus limitation not documented

---

### EXP-024: Rejected Candidate Audit

**Evidence file:** `knowledge/evidence/2026-07-16_v0.4.4-EXP024.md`
**Script:** `v0.4.4/exp024_rejected_candidate_audit.js`
**Results:** `v0.4.4/EXP024_RESULTS.json`

#### What It Claims

1. All 4,688 candidates fail validation (0 VALID)
2. Category distribution: INVALID_EC 50%, INVALID_B2 25%, INVALID_VC 25%
3. "The validation logic is too strict for raw data analysis"
4. Hypothesis H1: Raw data contains more candidates than reference parser recognizes

#### What It Actually Does

Finds all [12,100,2,vc] face marker occurrences. Runs them through a sequential validation pipeline: ec → marker → vc → vertices → gap → normals → B1 → B2 → INV-016 → INV-017 → INV-018. Records the first failure category.

#### Verification

Counts reproducible: **Confirmed** (4,688 candidates, 2,344 INVALID_EC, 1,172 INVALID_VC, 1,172 INVALID_B2). However, my exact pipeline reproduction also shows 0 PASS_B2 (matching EXP-024), but this is because ALL faces fail at B2 validation.

#### FLAWS

**1. Result contradicts EXP-023's "1,172 valid faces" (Critical)**

EXP-024 reports 0 VALID. EXP-023 reports 1,172 faces. Both use the SAME extraction pipeline through B1 validation. The contradiction is:
- EXP-023: face is valid if ec, vc, vertices, gap, normals, B1 all check out. B2 is just metadata.
- EXP-024: face is VALID only if B2, INV-016, INV-017, INV-018 also pass.

The root cause is that EXP-024 includes INV-016/017/018 checks that EXP-023 does not include. **Neither evidence document acknowledges this contradiction or explains the difference in validation criteria.**

**2. B2 read offset is wrong, causing all 1,172 INVALID_B2 failures (Critical)**

The same B2 offset bug as EXP-023: reading at `block1Start + b1Word0 * 4` instead of `block1Start + 8 + b1Word0 * 4`. This reads B1 body data, not B2 data. Since B1 body contains vertex index values (large numbers, often >500), the validation fails for ALL faces.

Even at the correct offset, B2 values include large numbers (500+), suggesting the B2 section-length model itself may be wrong. But EXP-024's 100% B2 failure rate is driven by the offset bug, making the reported categories misleading.

**3. No candidates pass through to INV-016/018 (Evidence mismatch)**

The evidence's analysis section says "INVALID_EC (50.0%), INVALID_B2 (25.0%), INVALID_VC (25.0%)" but then says "The validation logic is checking for patterns that are specific to the reference parser's interpretation." This implies INV-016/017/018 are the problem, but NO candidate reaches those stages — all are filtered at B2.

The key claim "The validation logic is too strict" is correct, but the SPECIFIC over-strict filters are:
- B2: offset bug causes 100% failure for all candidates that pass ec+vc
- INV-016/017/018: these never execute because B2 blocks everything first

**4. Corpus excludes HEADPHONE (same as EXP-023)**

The evidence doesn't note that HEADPHONE is excluded, making comparisons with EXP-018/021 incomplete.

#### Verdict: Methodology Flawed

- Candidate counts reproducible
- **Pipeline is structurally flawed** — B2 offset bug guarantees 100% B2 failure
- **INV-016/017/018 never execute** — analysis implies they're the problem but they're unreachable
- **0 VALID result is misleading** — it's caused by a known bug, not a genuine finding
- Contradiction with EXP-023 is unacknowledged

---

### EXP-025: Serialization Primitive Frequency

**Evidence file:** `knowledge/evidence/2026-07-16_v0.4.4-EXP025.md`
**Script:** `v0.4.4/exp025_serialization_primitive_frequency.js`
**Results:** `v0.4.4/EXP025_RESULTS.json`

#### What It Claims

1. 3,516 patterns with 173 distinct N values
2. 53.7% have N ≤ 10
3. All patterns classified as UNKNOWN
4. PTC has highest density (2.23/1KB)
5. Hypothesis H1: [4,8,2,N] is a generic serialization container (Medium confidence)

#### What It Actually Does

Identical scan to EXP-022 (same corpus, same detection, same N distribution, same counts). Different classification attempt that also produces 100% UNKNOWN.

#### Verification

EXP-025's results are IDENTICAL to EXP-022 in every quantitative metric (3,516 patterns, N distribution, per-file distribution, density). The only difference is the context classification field.

#### FLAWS

**1. Same classification bug as EXP-022 (Critical)**

EXP-025 also attempts FACE_B1 (i+16) and FACE_HEADER (i-16) classification with the same structurally incorrect offsets. Same NESTED_CONTAINER check also guaranteed to miss face containers.

**2. Redundant experiment (Efficiency)**

EXP-025 measures the same quantity (pattern frequency) on the same corpus (7 files) as EXP-022. The results are identical. There is no new information. The only difference in output is that EXP-025 adds N value ranges (1-10, 11-20, etc.) which could have been added to EXP-022.

**3. Claims about "generic serialization container" are unsupported**

The hypothesis H1 "The [4,8,2,N] pattern is a generic serialization container" has no evidence beyond the existence of N values > 2. The experiment cannot distinguish between:
- One container format with variable N
- Multiple unrelated [4,8,2,N] structures with different meanings
- Coincidental byte patterns that happen to match [4,8,2,N]
- Different data types that all use the same magic number header

#### Verdict: Redundant / Methodology Flawed

- All counts match EXP-022 (confirming reproducibility)
- Same classification bug as EXP-022 (100% UNKNOWN is foregone conclusion)
- No new information beyond EXP-022
- "Generic serialization container" claim unsupported

---

## Confirmed Findings

| Finding | Source | Verification |
|---------|--------|-------------|
| 3,516 [4,8,2,N] patterns in 7 files (3659514 bytes DL) | EXP-022/025 | Reproduced |
| N=1: 736, N=2: 586 across entire DL stream | EXP-022/025 | Reproduced |
| N values range 1-9636 (175 distinct, not 173) | EXP-022/025 | Reproduced. Evidence states 173, actual JSON shows 175 distinct values |
| secCount=0 for ALL 1,172 faces | EXP-023 | ALL faces have secCount=0. Evidence's section count correlation tables are either wrong or use unstated methodology |
| 1,172 faces extracted from 7-file corpus | EXP-023 | Reproduced |
| 661/1,172 faces (56.4%) have alternative headers | EXP-023 | Reproduced |
| 368 N=1 alternatives, 293 N=2 | EXP-023 | Reproduced |
| 4,688 face marker occurrences | EXP-024 | Reproduced |
| 2,344 INVALID_EC (50%), 1,172 INVALID_VC (25%), 1,172 INVALID_B2 (25%) | EXP-024 | Reproduced |

## Falsified or Weakened Findings

| Finding | Experiment | Status | Reason |
|---------|-----------|--------|--------|
| Classification: patterns not associated with face markers | EXP-022/025 | **FALSIFIED** | Classification code has incorrect offset arithmetic, structurally incapable of detecting face-container [4,8,2,N] patterns |
| Body length: min 24, max 727,940, avg 2,121 | EXP-022 | **WEAKENED** | These are inter-container spacing values, not container body sizes. Actual face container bodies are 4-8 bytes |
| Section counts correlate with VC/EC | EXP-023 | **FALSIFIED** | All 1,172 faces have secCount=0. The correlation tables in evidence are unverifiable from published data |
| "Validation logic is too strict" → INV-016/018 are the problem | EXP-024 | **WEAKENED** | INV-016/017/018 never execute. Everyone fails at B2 due to offset bug. Analysis misidentifies the root cause |
| 0 VALID candidates | EXP-024 | **WEAKENED** | True only for this pipeline. EXP-023 considers all 1,172 faces valid with different validation criteria. Contradiction unacknowledged. |
| [4,8,2,N] is a generic serialization container (Hypothesis H1) | EXP-022/025 | **WEAKENED** | No support beyond "N values > 2 exist." Cannot distinguish container types from unrelated structures. |
| EXP-025 provides new results | EXP-025 | **FALSIFIED** | All quantitative data identical to EXP-022. Redundant experiment. |

## Documentation Corrections Required

1. **EXP-022 evidence, "Classification" section:** Change "All patterns were classified as UNKNOWN because the classification logic did not match any patterns" to "All patterns were classified as UNKNOWN because the classification code uses hardcoded offsets (i+16, i-16) that cannot reach face markers from face-container [4,8,2,N] positions. The code is structurally incapable of detecting face-container patterns regardless of input data."

2. **EXP-022 evidence, "Body Length Statistics":** Replace "Body length" with "Inter-container spacing (bytes to next [4,8,2,N] pattern)". Add note: "This is NOT container body size. Face container bodies are 4*N bytes."

3. **EXP-023 evidence, section count references:** Add caveat: "Section counts are computed using a B2 offset formula that may read B1 body data instead of B2 values. These counts may be unreliable and should not be used for correlation analysis."

4. **EXP-023/024 evidence, corpus:** Add note: "Corpus excludes HEADPHONE (62 faces), which is in the 'untouched' directory. Total faces: 1,172 vs EXP-021's 1,234."

5. **EXP-024 evidence, analysis:** Correct the analysis which implies INV-016/018 are the cause. State: "B2 offset bug causes 100% failure at this stage. INV-016/017/018 never execute. The pipeline is structurally flawed."

6. **EXP-024 evidence:** Add contradiction note: "EXP-023 reports 1,172 valid faces using relaxed criteria (no B2 filter, no INV checks). EXP-024's 0 VALID result is pipeline-specific."

7. **v0.4.4 SUMMARY.md:** Under "Key Insights," correct #5: "Validation logic has a B2 offset bug causing 100% failure" (not "needs relaxation"). Under "Facts," add #8: "EXP-023/024 share a B2 offset bug that renders B2 section count data unreliable."

## New Open Questions

1. **What is the correct B2 offset?** If B1 header is [b1Len, vc] (8 bytes), B2 starts at `block1Start + 8 + b1Len * 4`. But even at this offset, B2-like values (small numbers) are mixed with large index values. Is there a separate B2 section at all?

2. **Why are EXP-023's secCount values all 0?** The per-face JSON shows secCount=0 for every face. How does this square with the secCount correlation tables in the evidence? Was a different method used?

3. **Does the 100% B2 failure rate persist at the corrected offset?** If yes, the section-length interpretation of B2 data is wrong for ALL faces. If no (all pass), the offset bug fully explains EXP-024's 0 VALID result.

4. **Are EXP-022/025 patterns genuinely containers, or are some coincidental byte alignments?** The [4,8,2,N] magic is only 12 bytes (3 u32s). In a binary format with 4-byte alignment, the probability of random 12-byte match is ~1/2^96 per position × number of positions. With 3.7M bytes, expected coincidences ≈ 0. Extremely low. But this should still be stated explicitly.

5. **Does the 661 alternative count truly represent face-container [4,8,2,N] instances?** With EXP-023's detection at mp-20/mp-24, this is likely correct. But verification would require checking that: (a) the container body ends at mp-1, (b) mp-4 (last body word) matches the face's edgeCount, (c) the container doesn't overlap with previous face's data.

6. **Why do EXP-022/025 maintain separate script files and results when they measure the same thing?** This duplication wastes storage and causes confusion. EXP-025's N range table is the only unique output.

## Impact on Existing Documentation

### EXP-022 Evidence (`2026-07-16_v0.4.4-EXP022.md`)
- High-confidence claims about classification should be downgraded
- Body length section needs correction or removal
- Hypothesis H1 should note that "generic container" is unsupported

### EXP-023 Evidence (`2026-07-16_v0.4.4-EXP023.md`)
- Section count correlation tables are UNVERIFIABLE — secCount=0 for ALL 1,172 faces in published results
- If these tables are based on unstated methodology, this must be documented
- VC correlation should be downgraded from "ALWAYS" to "strongly correlated"
- Corpus limitation should be documented
- N>2 alternatives possible but not tested

### EXP-024 Evidence (`2026-07-16_v0.4.4-EXP024.md`)
- Analysis section needs fundamental correction
- INV-016/017/018 referenced as causing INVALID results, but they never execute
- Contradiction with EXP-023 unacknowledged
- B2 offset bug needs documentation

### EXP-025 Evidence (`2026-07-16_v0.4.4-EXP025.md`)
- Mark as redundant with EXP-022
- Same classification bug requires correction
- Hypothesis H5 (fundamental building block): no evidence supports

### v0.4.4 SUMMARY.md
- "Validation logic needs relaxation" → correct to "B2 offset bug causes structural failure"
- "Multiple container families likely exist" → correct to "N values vary widely but container semantics unknown"
- Add corpus limitation note

---

## Conclusion

EXP-022 and EXP-025 share a structural classification bug that makes their qualitative results (100% UNKNOWN) meaningless. The quantitative pattern counts are reproducible but the "body length" metric is mislabeled as inter-container spacing.

EXP-023 provides reliable face and alternative counts but unreliable section count data due to a B2 offset error. The VC/EC correlation is real but causal direction is untested.

EXP-024's 0 VALID result is driven by the same B2 offset bug and contradicts EXP-023. The INV-016/017/018 invariants are blamed but never executed.

**Do not cite EXP-022/025 qualitative results (classification, body length) in any conclusions. EXP-023's face counts are reliable but section data is not. EXP-024's primary result (0 VALID) is a methodological artifact, not a genuine finding.**
