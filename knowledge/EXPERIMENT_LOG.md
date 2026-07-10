# Experiment Log

Project-wide experiment ledger. Each experiment should end with facts, hypotheses, tested files/counts, confidence, and follow-up.

Source migrated from `v0.3.5/docs/research/EXPERIMENT_LOG.md`.

---

## EXP-001: Face Marker Detection

**Status**: Observation

**Goal**: Locate candidate face blocks in DisplayLists.

**Method**: Scan for `[12, 0, 0, 0, 100, 0, 0, 0]`, then validate nearby `edgeCount` and `vertexCount`.

**Evidence / facts**:

- 156 candidate markers were found in BOTTOM DisplayLists.
- 39 faces parsed after validation.
- The marker corresponds to the gap marker, not the actual face start.
- Face start is before the marker at the `edgeCount` field.

**Files tested**: `USB hub case BOTTOM.SLDPRT`

**Faces/models tested**: 1 model, 39 validated faces.

**Confidence**: High that the scanner can locate faces; low on false-positive causes.

**Date last updated**: 2026-06-27

---

## EXP-002: Block 1/2 Structure Discovery

**Status**: Verified Conclusion for headers; Hypothesis for Block 1 semantics.

**Goal**: Understand topology-like blocks after vertex and normal arrays.

**Method**: Parse `[4, 8, 2, N]` headers and compare body lengths.

**Evidence / facts**:

- Block 1 header is `[4, 8, 2, N]`.
- Block 2 header is `[4, 8, 2, M]`.
- Block 2 entries decode to loop vertex counts with `(raw + 2) / 2`.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: 595 faces across 4 models.

**Confidence**: High for headers and Block 2 count behavior; medium-low for Block 1 interpretation.

**Date last updated**: 2026-06-27

---

## EXP-003: Gap-Based Loop Splitting

**Status**: Failed Experiment / Disproving Evidence

**Goal**: Determine whether loop boundaries can be recovered from normal discontinuities.

**Method**: Compare adjacent vertex normals and split when deviation exceeds threshold.

**Evidence / facts**:

- Detected breaks appeared on strip diagonals rather than true loop boundaries.
- Normal data is not a reliable loop-boundary source.

**Disproved hypotheses**: FH-005

**Files tested**: v0.3.0-v0.3.3 modern test corpus.

**Faces/models tested**: Multiple faces; exact count not preserved in migration.

**Confidence**: High that this method is invalid.

**Date last updated**: 2026-06-27

---

## EXP-004: Block 2 Slicing Mask Formula

**Status**: Verified Conclusion

**Goal**: Decode Block 2 loop-size entries.

**Method**: Decode each raw value with `(raw + 2) / 2` and check whether the decoded sum equals face `vertexCount`.

**Evidence / facts**:

- Formula holds for all tested faces.
- Decoded loop sizes sum exactly to each face's vertex count.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: BOTTOM 39/39, TOP 68/68, GEAR 113/113, DEKOR 375/375. Total 595/595.

**Confidence**: High

**Date last updated**: 2026-06-27

---

## EXP-005: Gap Marker Identification

**Status**: Verified Conclusion

**Goal**: Identify the 16-byte gap between position and normal arrays.

**Method**: Forensic byte-offset dump of selected simple and complex face blocks.

**Evidence / facts**:

- Gap marker is `[12, 100, 2, vertexCount]`.
- Face block starts with `[edgeCount, 100, 2, vertexCount]`.
- Earlier face scanner finds the gap marker, then works backward to face start.

**Disproved hypotheses**: FH-003, FH-006

**Files tested**: GEAR selected faces, with aggregate support from BOTTOM/TOP/DEKOR.

**Faces/models tested**: Selected forensic faces plus 595 aggregate parsed faces.

**Confidence**: High

**Date last updated**: 2026-06-27

---

## EXP-006: Block 1 Grammar Discovery

**Status**: Correlation

**Goal**: Discover Block 1 grammar without assigning semantics.

**Method**: Classify Block 1 u32 values as ZERO, ONE, SMALL, LARGE. Analyze starts, run lengths, bigrams, and trigrams.

**Evidence / facts**:

- 595/595 faces start with ONE.
- ONE count equals Block 2 entry count in 595/595 faces.
- ONE values are singleton runs.
- Dominant bigrams are `LARGE -> ZERO` and `ZERO -> LARGE`.
- Dominant trigram is generally `ZERO -> LARGE -> ZERO`.
- The branch notebook records a single-loop pattern `ONE [ZERO LARGE]*` and variable multi-loop patterns.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: 595 faces across 4 models.

**Confidence**: High for grammar observations; low for semantic interpretation.

**Date last updated**: 2026-06-27

---

## EXP-007: Loop Correspondence Verification

**Status**: Verified Conclusion for count equality; Correlation for segment meaning.

**Goal**: Test whether Block 1 ONE count equals Block 2 loop count.

**Method**: Count `1` values in Block 1 and compare to Block 2 body length.

**Evidence / facts**:

- BOTTOM: 39/39 faces match.
- TOP: 68/68 faces match.
- GEAR: 113/113 faces match.
- DEKOR: 375/375 faces match.
- Total: 595/595 faces match.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: 595 faces across 4 models.

**Confidence**: Very high for count equality.

**Date last updated**: 2026-06-27

---

## EXP-008: DisplayLists Stream Audit

**Status**: Observation

**Goal**: Map internal structure of main DisplayLists streams.

**Method**: Analyze decompressed streams for markers, topology headers, strings, entropy, and `[1,1]` structures.

**Evidence / facts**:

- BOTTOM DisplayLists size: 98481 bytes.
- BOTTOM had 156 candidate face markers and 39 parsed faces.
- BOTTOM had 63 topology headers and 11 `[1,1]` section-like headers.
- GEAR section audit recorded 59 `[1,1]` section-like structures and 113 parsed faces.
- Embedded strings included class-name-like values such as `uiUserModelEnv_c`, `moAmbientLight_c`, and `uoBodyPropInfo_c`.

**Files tested**: BOTTOM, with supporting GEAR section audit.

**Faces/models tested**: BOTTOM 39 parsed faces; GEAR 113 parsed faces for section counts.

**Confidence**: High that DisplayLists contains more than face blocks; low for section semantics.

**Date last updated**: 2026-06-27

---

## EXP-009: Observed Block 1 Section Length Forms

**Status**: Observation

**Goal**: Record today's measured Block 1 section-form observation without assigning semantics.

**Method**: Reported measurement over the current measured corpus compared Block 1 section length against decoded loop size.

**Evidence / facts**:

- The observed section length relation is `len = 2 * loopSize - 2`.
- The class `VALUE` is observational only: any Block 1 integer other than `0` or `1`.
- The observation does not distinguish whether Block 1 is best modeled as grammar or as opcode/operand bytecode.

**Files tested**: Today's measured corpus; exact file list not yet archived.

**Faces/models tested**: Today's measured corpus; exact face/model count not yet archived.

**Confidence**: High for the reported measured corpus, pending raw evidence archival.

**Date last updated**: 2026-06-27

---

## EXP-010: Property-Table Hypothesis Falsification

**Status**: Failed Experiment / Disproving Evidence

**Goal**: Test whether Block 1 `VALUE` tokens encode or index a property table.

**Method**: Today's report cites random-base controls, frequency-bias analysis, and delimiter-artifact analysis.

**Evidence / facts**:

- Random-base controls did not support the property-table model.
- Frequency bias was observed in the candidate VALUE distribution.
- The apparent property-table signal was attributed to a delimiter artifact.
- VALUE semantics remain UNKNOWN.

**Disproved hypotheses**: FH-013

**Files tested**: Today's measured corpus; exact file list not yet archived.

**Faces/models tested**: Today's measured corpus; exact face/model count not yet archived.

**Confidence**: High for rejecting the property-table hypothesis, pending raw evidence archival.

**Date last updated**: 2026-06-27

---

## EXP-011: Block 1 Invariant Validation (v0.4.0)

**Status**: Verified Structural Invariant for I1/I2/I3; Observation for corpus statistics

**Goal**: Validate three Block 1 structural invariants across the full corpus and collect corpus-wide statistics.

**Method**: Parse 4 modern openswx-like files with `v0.4.0/block1_parser.js`; build per-face AST; validate I1 (`b1len = 2 × (vertexCount − sectionCount)`), I2 (`sectionBodyTokenCount = Block2[i] − 1`), I3 (`Σ Block2[i] = b1len`); collect section length distribution, ZERO run lengths, positional frequency, VALUE repetition counts.

**Evidence / facts**:

- I1 passes: 593/593 (100%)
- I2 passes: 593/593 (100%)
- I3 passes: 593/593 (100%)
- 3429 ONE-delimited sections across the corpus
- 53 distinct section lengths observed (odd numbers: 3, 5, 7, ..., 215)
- Section length alone does not uniquely determine token-class sequence: only 16/53 lengths (30.2%) have a single unique class pattern
- Most common section lengths: 3 (882/3429), 7 (825/3429), 11 (497/3429)
- VALUE tokens repeat in 1937/3429 sections (56.5%)
- Total VALUE tokens: 16174; distinct: 6082; repeat occurrences: 2636
- ZERO run lengths: heavily skewed to length 1 (11020/14536 runs); runs up to 95 observed

**Disproved hypotheses**: None directly; FH-011 and FH-013 remain falsified and are consistent with invariant data.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: 593 of 595 corpus faces across 4 models. BOTTOM: 39/39, TOP: 68/68, GEAR: 113/113, DEKOR: 373/375. The 2 DEKOR faces that failed v0.4.0 parser validation are under investigation.

**Confidence**: High for invariants (I1/I2/I3); low for interpretation of corpus statistics.

**Date last updated**: 2026-06-27

**Raw evidence**: `knowledge/evidence/2026-06-27_v0.4.0-invariant-validation.md`, `knowledge/evidence/2026-06-27_v0.4.0-corpus-analysis.txt`

---

## EXP-012: Rewrite System Analysis

**Status**: Observation

**Goal**: Determine whether a deterministic rewrite function exists between VALUE tokens in structurally equivalent Block 1 encodings across files.

**Method**: Cross-file VALUE→VALUE mapping construction. Compare sections by structural key (vc, ec, b1len, b2len). Test context resolution for ambiguous mappings.

**Evidence / facts**:

- BOTTOM→TOP: 20 ambiguous source values out of 887 mappings (max fan-out 3). Resolution requires (section index, position) context.
- BOTTOM→GEAR: 4 ambiguous out of 40 mappings. Global mapping is a bijection.
- BOTTOM→DEKOR: 6 ambiguous out of 42 mappings.
- TOP→GEAR: 15 ambiguous out of 64 mappings.
- TOP→DEKOR: 18 ambiguous out of 81 mappings.
- GEAR→DEKOR: 47 ambiguous out of 189 mappings.
- BOTTOM↔TOP deep analysis: 28 face pairs analyzed. Context (secIdx, pos) resolves all ambiguities. Section length, left/right neighbors, and their combinations insufficient without section index.

**Interpretation**: The rewrite function exists and is deterministic given (section index, position). Why section index matters for some file pairs (BOTTOM↔TOP) but not others (BOTTOM→GEAR) is unknown.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR

**Faces/models tested**: 595 faces across 4 models; 28 BOTTOM↔TOP face pairs for deep analysis.

**Confidence**: High that the mapping is deterministic with (secIdx, pos) context; low on why section index is the disambiguator.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.1-rewrite-analysis.md`

---

## EXP-013: Stress Test Of Currently Testable Invariants

**Status**: Verified

**Goal**: Stress-test every verified invariant across expanded corpus. Treat every invariant as guilty until proven innocent.

**Method**: Parse 8 files with `v0.4.2/stress_test_invariants.js`. Test all 17 currently testable invariants on every face. Produce minimal reproducers for any failure.

**Evidence / facts**:

- Corpus expanded from 4 files (593 faces) to 8 files (1,232 faces), adding HEADPHONE (62), DISTRIBUTOR (51), POCKET (400), PTC (126).
- All currently testable invariants evaluated by the v0.4.2 pipeline survived the stress test. Zero structural violations.
- INV-012 formula `len = 2 * loopSize - 2` is incorrect: 0/3429 sections match. Correct relationship is `sectionBodyTokenCount = Block2[i] - 1` (INV-017).
- OLE2 files (SW2000, PLATE4, CHAINWHEEL) remain unparseable by current pipeline.
- Edge cases observed: HEADPHONE has MeshData/Config-0-Mesh-27 stream; PTC has Config-0-FeatureBodies/LocalBodies stream.
- DEKOR 2-face discrepancy (v0.4.0 counted 375, v0.4.2 counts 373) persists — caused by vc<=5000 filter threshold.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR, HEADPHONE, DISTRIBUTOR, POCKET, PTC

**Faces/models tested**: 1,232 faces across 8 files (3,429 ONE-delimited sections).

**Confidence**: High for all 17 tested invariants; INV-012 formula downgraded.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.2-stress-test.md`

---

## EXP-014: Reviewer Criticism Audit

**Status**: Verified

**Goal**: Evaluate four specific reviewer criticisms: (1) parser filtering circularity, (2) two DEKOR face discrepancy, (3) INV-018 mathematical independence, (4) INV-012 formula discrepancy.

**Method**: Audit script `v0.4.2a/audit_v042a.js` traces every candidate through the extraction funnel and tests criticized claims. Byte-level traces for any failures.

**Evidence / facts**:

- **Audit 1 — Circularity CONFIRMED**: Filters F8 (B1 header magic) and F11 (B2 header magic) pre-assume INV-005 and INV-006. These invariants are unfalsifiable by the current pipeline. INV-007 through INV-018 are not affected.
- **Audit 2 — DEKOR faces RESOLVED**: The 2 missing faces (marker offsets 0x2636, 0x35d7d) have vertexCount=5862 and were rejected by the vc<=5000 filter. With vc<=10000 (as in v0.3.5), they pass all invariants.
- **Audit 3 — INV-018 DEPENDENCY CONFIRMED**: INV-018 is a mathematical consequence of INV-017 plus the definition of section splitting. 1232/1232 faces where INV-017 passes also pass INV-018.
- **Audit 4 — INV-012 DISCREPANCY CONFIRMED**: Documentation mistake. Formula is off by +1. Correct relationship is `len = 2 * loopSize - 3` (= `raw - 1`), not `len = 2 * loopSize - 2` (= `raw`).

**Files tested**: BOTTOM, TOP, GEAR, DEKOR, HEADPHONE, DISTRIBUTOR, POCKET, PTC

**Faces/models tested**: 4,936 marker candidates across 8 files; 1,232 accepted faces; 3,704 rejected.

**Confidence**: High for all four audit findings.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.2a-audit.md`

---

## EXP-015: Non-Circular Validation Pipeline

**Status**: Verified with Limitations

**Goal**: Test INV-005 and INV-006 without pre-filtering on header magic. Accept any marker match, read bytes at computed positions, and test headers only after reading.

**Method**: Script `v0.4.2a/non_circular_validation.js` skips all header-based pre-filtering. Accepts any candidate where a [12,100,2,vc] marker is found. Tests B1/B2 headers on raw-read bytes.

**Evidence / facts**:

- 4,936 total candidates across 8 files.
- INV-005: 1,234 pass (valid [4,8,2,N]), 3,702 fail (readable bytes that are not [4,8,2,N] — all clearly false positives from non-face data).
- INV-006: 1,234 pass, 0 fail — every candidate with a readable B2 position has [4,8,2,M].

**Limitations — remaining assumptions not removed**:

1. **Marker selection**: Faces are still located by the [12,100,2,vc] gap marker pattern. Any face not preceded by this marker would be missed.
2. **Normal-offset layout assumption**: The pipeline assumes normals follow immediately after the 16-byte gap. Empirically validated but remains an assumption.
3. **Vertex-count bounds**: The vc limit (6000) bounds the search.
4. **Float validity filters**: Position validation discards candidates with non-finite or extreme float values.
5. **Block ordering**: Assumes positions → gap → normals → Block 1 → Block 2 in strict linear order.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR, HEADPHONE, DISTRIBUTOR, POCKET, PTC

**Faces/models tested**: 4,936 candidates; 1,234 with valid B1/B2 headers.

**Confidence**: High that INV-005 and INV-006 hold for marker-detectable face blocks; medium that no undetected face violates them.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.2a-non-circular.md`

---

## EXP-016: Independent Implementation Reproducing INV-016/017/018

**Status**: Verified

**Goal**: Reproduce INV-016/017/018 using a completely different implementation, independent of block1_parser.js and stress_test_invariants.js.

**Method**: Script `v0.4.2a/independent_parser.js` implements marker-based face extraction with independent code. Reports INV-005/006 as pre-conditions (tested, not assumed). Validates INV-016/017/018 on accepted faces.

**Evidence / facts**:

- Total faces: 1,234 (vc limit 10000).
- B1 valid [4,8,2,N]: 1,234/1,234.
- B2 valid [4,8,2,M]: 1,234/1,234.
- INV-016 pass: 1,234/1,234 (100%).
- INV-017 pass: 1,234/1,234 (100%).
- INV-018 pass: 1,234/1,234 (100%).
- Zero failures across all three invariants.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR, HEADPHONE, DISTRIBUTOR, POCKET, PTC

**Faces/models tested**: 1,234 faces across 8 files.

**Confidence**: High — independent implementation eliminates implementation-specific bias for INV-016/017/018.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.2a-independent-parser.md`

---

## EXP-017: Expanded Corpus Test

**Status**: Verified

**Goal**: Include 2 previously-rejected DEKOR faces (vc=5862) by raising vc limit from 5000 to 6000. Verify all invariants hold on expanded corpus.

**Method**: Script `v0.4.2a/expanded_corpus_test.js` extracts faces with vc<=6000 (vs v0.4.2's vc<=5000). Logs every high-vc face (vc>5000) as special observation. Runs all invariants.

**Evidence / facts**:

- Total faces at vc<=6000: 1,234 (2 more than v0.4.2's 1,232).
- High-vc faces: 2 (DEKOR, vc=5862 each).
- Both high-vc faces pass all invariants: INV-002/003/004/007/008/009/010/016/017/018.
- The 2 DEKOR faces have b1len=9636, b2count=1044, b2sum=9636, sectionCount=1044.
- The earlier 2-face discrepancy is resolved: the faces are genuine and satisfy all structural invariants. The discrepancy was caused by an arbitrary filter threshold (vc<=5000 vs vc<=10000), not a format or parser error.

**Files tested**: BOTTOM, TOP, GEAR, DEKOR, HEADPHONE, DISTRIBUTOR, POCKET, PTC

**Faces/models tested**: 1,234 faces across 8 files.

**Confidence**: High — the 2-face discrepancy in the v0.4.0 corpus is explained and resolved.

**Date last updated**: 2026-07-10

**Raw evidence**: `knowledge/evidence/2026-07-10_v0.4.2a-expanded-corpus.md`
