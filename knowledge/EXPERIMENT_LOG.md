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

---

## EXP-027: Binary Differential Analysis of Controlled Corpus

**Status**: Observation

**Goal**: Investigate how known geometric changes (scale, translation, hole diameter/position, fillet, chamfer, shell) manifest in decompressed DisplayLists streams using controlled differential pairs.

**Method**: Byte-level differential analysis of 9 controlled model pairs with known geometric differences, plus vertex position extraction and structural comparison. All 11 controlled models (C00-C10) parsed with the validated v0.4.5/v0.4.6 pipeline.

**Evidence / facts**:

- **Scale (C00↔C01)**: 355 bytes changed (2.95%). DL sizes identical. 0/6 structural differences. Vertex positions scaled by factor of 2.0. Pure position-data transformation.
- **Translation (C00↔C02)**: 1,141 bytes changed (9.47%). DL sizes identical. 0/6 structural differences. Vertex positions translated by (50,50,0)mm. Pure position-data transformation.
- **Hole Diameter (C04↔C05)**: 6,853 bytes changed (36.00%). DL sizes different (19,036 vs 17,688). 3/7 structural differences. Cylindrical surface vc scales with diameter (70 for 5mm, 56 for 3mm).
- **Hole Position (C04↔C06)**: 6,075 bytes changed (31.80%). DL sizes slightly different. 2/7 structural differences. Top/bottom face vc changes, cylindrical vc unchanged.
- **Fillet (C00↔C03)**: 7,477 bytes changed (52.10%). DL sizes different (12,050 vs 14,350). +1 face. Fillet surface ec=13, vc=16.
- **Hole Introduction (C00↔C04)**: 14,218 bytes changed (74.69%). DL sizes very different (12,050 vs 19,036). +1 face. Cylindrical surface ec=70, vc=70.
- **Second Hole Modified (C07↔C08)**: 9,682 bytes changed (37.28%). DL sizes different. 3/8 structural differences. Only affected hole's faces change.
- **Chamfer (C00↔C09)**: 6,444 bytes changed (48.30%). DL sizes different (12,050 vs 13,342). +1 face. Chamfer surface ec=4, vc=4 (flat).
- **Shell (C00↔C10)**: 9,413 bytes changed (54.47%). DL sizes very different (12,050 vs 17,280). +5 faces. Inner walls ec=4, vc=4 each.

**Key findings**:
1. Vertex positions are Float32. Scale/translation are pure position-data transformations.
2. Feature operations change face counts and vertex/edge counts.
3. Hole diameter affects cylindrical surface vc (approximately linear scaling).
4. Feature operations are localized to affected faces.
5. Curved surfaces (fillet, cylinder) have high ec/vc; flat chamfer has low ec/vc.

**Files tested**: C00-C10 (11 controlled models)

**Faces/models tested**: 85 faces across 11 models. All pass INV-016/017/018.

**Confidence**: High for structural observations. Medium for vertex position interpretations (limited to matching-structure faces).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP027.md`, `v0.4.7/CORPUS_AUDIT.json`, `v0.4.7/BINARY_DIFF_SUMMARY.json`, `v0.4.7/VERTEX_ANALYSIS.json`

### CORRECTION NOTE (2026-08-14, Archivist Audit)

Key findings (3) "Hole diameter affects cylindrical surface vc (approximately linear scaling)" and (4) "Feature operations are localized to affected faces" are **falsified/weakened by the very next experiment, EXP-028**, run the same day:

- (3) is **FALSIFIED**: EXP-028 Investigation 1 found vc ratio 70/56=1.25 ≠ diameter ratio 5/3=1.67 (only 2 data points; "linear" was an overclaim from n=2 without checking the ratio). See `FAILED_HYPOTHESES.md`.
- (4) is **WEAKENED**: EXP-028 Investigation 2 found binary diffs are dominated by inter-face metadata (50–80%), not face geometry, because the DisplayLists stream is re-serialized in full whenever any face changes (global byte offsets shift). "Localized" overstated what byte-level differencing can show.

This entry (EXP-027) is retained unmodified above for historical continuity per the append-only policy. See EXP-028 below and `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Finding C).

---

## EXP-028: Validation/Falsification of EXP-027 Conclusions

**Status**: Verified (with falsifications)

**Goal**: Validate or falsify EXP-027's conclusions through three targeted investigations: (1) hole-diameter relationship, (2) feature-change localization, (3) SLDPRT↔STEP/STL vertex correspondence.

**Method**: Three dedicated scripts analyzing controlled corpus pairs with explicit tolerance thresholds and numerical comparison.

**Evidence / facts**:

- **Investigation 1 (Hole-Diameter)**: C04 cylindrical vc=70, C05 cylindrical vc=56. Ratio 70/56=1.25 ≠ diameter ratio 5/3=1.67. **EXP-027's "linear scaling" claim FALSIFIED.** With only 2 data points, exact relationship unknown.
- **Investigation 2 (Feature Localization)**: Binary diffs dominated by inter-face metadata (50-80%), not face geometry. Face start offsets shift globally. **EXP-027's "localized to affected faces" claim WEAKENED.** DL is re-serialized entirely on face changes.
- **Investigation 3 (Vertex Correspondence)**: SLDPRT↔STEP exact matches: 3/24 (C00), 6/212 (C04), 4/60 (C03). Mean distance ~0.01mm. **SLDPRT vertices are tessellated approximations, NOT exact B-rep vertices.**

**Key findings**:
1. VC-diameter relationship is NOT linear (ratio mismatch).
2. Feature changes are NOT localized in binary representation.
3. SLDPRT vertices are DisplayList tessellation, not exact geometry.
4. DL is re-serialized entirely on any face change.

**Files tested**: C00, C03, C04, C05, C07, C08, C09, C10

**Faces/models tested**: 8 models, 3 investigations

**Confidence**: High for all three investigations. Explicit tolerance thresholds used.

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP028.md`, `v0.4.7/EXP028_HOLE_DIAMETER.json`, `v0.4.7/EXP028_FEATURE_LOCALIZATION.json`, `v0.4.7/EXP028_VERTEX_CORRESPONDENCE.json`

---

## EXP-029: Block1/Block2 Geometry-Encoding Differential

**Status**: Complete

**Goal**: Determine whether Block1/Block2 section-body values contain geometry-dependent information, using the controlled C00–C10 corpus.

**Method**: Extract Block1/Block2 token sequences for all faces, match faces between models using structural properties, compare token sequences, analyze C04↔C05 cylindrical face tokens specifically.

**Evidence / facts**:

- **Cube face tokens consistent**: All cube faces (ec=4, vc=4) have identical tokens across C00, C03, C04, C09. Face 0 tokens: `[1, 5, 82, 0, 79, 62]` in all four models.
- **Cylindrical face tokens identical up to length**: C04 (vc=70) and C05 (vc=56) cylindrical faces have identical first 110 tokens. Pattern: `1, 0, 150, 0, 153, 0, 150, 0, 153, ...`
- **Token length correlates with vc**: Length = 2 * vc - 2 (matches INV-017 for secCount=1).
- **Face matching ambiguous**: All 6 cube faces in C00 have ec=4, vc=4, secCount=1 but different tokens.
- **Token values follow pattern**: Cube face tokens show correlation between token 1 and token 2 (sum increases with token 1).

**Key findings**:
1. Tokens are NOT random or structural-only (identical across models for same geometry).
2. Tokens do NOT encode diameter-specific information (identical up to length for different diameters).
3. Token length is determined by vc via INV-017 (structural invariant).
4. Face matching is ambiguous when using only ec/vc/secCount.
5. Token values may encode tessellation parameters or face orientation.

**Files tested**: C00, C03, C04, C05, C09

**Faces/models tested**: 30 faces across 5 models

**Confidence**: High for structural observations. Medium for token semantics (unknown).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP029.md`, `v0.4.7/EXP029_BLOCK1_GEOMETRY.json`, `v0.4.7/EXP029_SUMMARY.md`

---

## EXP-030: Block1 Token Structural Correspondence

**Status**: Complete

**Goal**: Determine whether Block1 body tokens correspond to structural/topological information rather than geometry-specific parameters.

**Method**: Test tokens against structural candidates (vertex indices, edge counts, loop sizes, Block2 values, etc.) across 6 controlled models.

**Evidence / facts**:

- **Cylindrical face pattern identical**: C04 (vc=70), C05 (vc=56), C11 (vc=64) all have same alternating pattern: `1, 0, 150, 0, 153, 0, 150, 0, 153, 0, ...`
- **Cube face tokens identical**: All cube faces (ec=4, vc=4) have identical tokens `[1, 5, 82, 0, 79, 62]` across all models.
- **No structural correspondence found**: Tokens do NOT correspond to vertex indices, edge counts, loop sizes, or Block2 values.
- **B1Len formula explained**: `b1Len = 2*(vc - secCount)` holds for all 41 faces.
- **Token values not vertex indices**: Token values exceed vertex count for all faces tested.

**Key findings**:
1. Cylindrical face pattern (150, 153) is a structural signature, not geometry-specific.
2. Cube face tokens are a structural signature.
3. No structural correspondence found for any tested candidate.
4. B1Len formula is a structural invariant.
5. Tokens cannot be vertex/edge indices.

**Files tested**: C00, C03, C04, C05, C09, C11

**Faces/models tested**: 41 faces across 6 models

**Confidence**: High for structural observations. Medium for token semantics (unknown).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP030.md`, `v0.4.7/EXP030_STRUCTURAL_CORRESPONDENCE.json`, `v0.4.7/EXP030_SUMMARY.md`

---

## EXP-031: Block1 Token Signature Classification

**Status**: Complete

**Goal**: Determine whether Block1 token sequences have reproducible signatures associated with face/serialization structure or face type.

**Method**: Classify faces by type (planar_cube, cylindrical, chamfer, multi_loop) and compute token signatures.

**Evidence / facts**:

- **C11 discrepancy resolved**: Preliminary output incorrectly identified face 5 (vc=57) as cylindrical. Actual cylindrical face is face 6 (vc=64).
- **Cylindrical faces share identical token signature**: C04 (vc=70), C05 (vc=56), C11 (vc=64) all have same alternating pattern: `1,0,150,0,153,0,...`
- **Planar cube faces have diverse token signatures**: 27 faces have 9 unique first-20 patterns.
- **Chamfer faces have diverse token signatures**: 2 faces have 2 unique patterns.
- **Multi-loop faces have diverse token signatures**: 9 faces have 9 unique patterns.
- **H1 (planar faces share one signature)**: FALSIFIED.
- **H2 (cylindrical faces share one signature)**: SUPPORTED.
- **H4 (geometry dimensions determine signature)**: FALSIFIED.

**Key findings**:
1. Cylindrical faces share a structural token signature regardless of hole diameter.
2. Planar cube faces have diverse token signatures that differ by face orientation.
3. Token signatures are partially determined by face type.
4. C11 confirms cylindrical face signature consistency.

**Files tested**: C00, C03, C04, C05, C09, C11

**Faces/models tested**: 41 faces across 6 models

**Confidence**: High for structural observations. Medium for token semantics (unknown).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP031.md`, `v0.4.7/EXP031_TOKEN_SIGNATURES.json`, `v0.4.7/EXP031_SUMMARY.md`

---

## EXP-032: Token Signatures vs Face Orientation

**Status**: Complete

**Goal**: Determine whether Block1 token signature differences observed among planar cube faces correlate with face orientation / surface normal direction.

**Method**: Determine face orientation from normal records (authoritative source) and compare token signatures across faces with same/different orientations.

**Evidence / facts**:

- **Planar cube faces have consistent token signatures for same orientation**: -X, -Y orientations have identical patterns across all models. +X, +Y orientations have two variants (standard and modified).
- **Token signature variation correlates with model type**: C03 (fillet) and C09 (chamfer) have modified patterns for +X and +Y orientations.
- **Cylindrical faces have consistent token signature regardless of orientation**: All 3 cylindrical faces have pattern `[1,0,150,0,153,0]`.
- **Multi-loop and chamfer faces have diverse token signatures**: 6 unique patterns for each orientation.
- **Opposite orientations have identical patterns**: +X/-X, +Y/-Y, +Z/-Z have same patterns.
- **H2 (orientation invariance)**: FALSIFIED - same orientation has different tokens across models.
- **H4 (serialization position)**: FALSIFIED - same face index has different tokens across models.
- **H5 (topology/vertex ordering)**: FALSIFIED - faces with same vertex position have different tokens.

**Key findings**:
1. Token signatures correlate with face orientation for planar cube faces.
2. Token signatures are influenced by model type (fillet/chamfer features).
3. Cylindrical faces share a structural token signature regardless of orientation.
4. Multi-loop and chamfer faces have diverse token signatures.

**Files tested**: C00, C03, C04, C05, C09, C11

**Faces/models tested**: 41 faces across 6 models

**Confidence**: High for structural observations. Medium for token semantics (unknown).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP032.md`, `v0.4.7/EXP032_TOKEN_ORIENTATION.json`, `v0.4.7/EXP032_SUMMARY.md`

---

## EXP-033: Token Signatures vs Feature-Induced Model State

**Status**: Complete

**Goal**: Determine why C03 (fillet) and C09 (chamfer) produce modified Block1 token signatures for otherwise comparable planar orientations, while C00/C04/C05/C11 retain the standard signatures.

**Method**: Controlled comparison of token signatures across models with different features (fillet, chamfer, hole), testing hypotheses about feature type, local topology, direct modification, adjacency, and global model state.

**Evidence / facts**:

- **Fillet and chamfer produce identical signature changes**: Both produce same changes for +X and +Y (4 changes each, identical patterns).
- **Signature changes occur without structural changes**: +X/+Y faces have identical ec=4, vc=4, secCount=1, b1Len=6 across all models.
- **Signature changes occur without direct modification**: +X/+Y faces are NOT directly modified by fillet/chamfer.
- **Signature changes occur without adjacency**: +X/+Y faces are NOT adjacent to modified geometry.
- **Signature changes occur with same face index**: +X at index 2, +Y at index 3 across all models.
- **Hole models do NOT produce signature changes**: C04/C05/C11 retain standard +X/+Y signatures.
- **+Z/-Z faces are replaced in feature models**: Planar_cube → multi_loop/chamfer.
- **H1 (feature type)**: SUPPORTED — fillet and chamfer produce identical changes.
- **H2 (local topology)**: FALSIFIED — signature changes occur without structural changes.
- **H3 (direct modification)**: FALSIFIED — signature changes occur without direct modification.
- **H4 (adjacency)**: FALSIFIED — signature changes occur without adjacency.
- **H5 (global model state)**: SUPPORTED — signature changes correlate with model type.
- **H6 (orientation plus structural variable)**: SUPPORTED — orientation alone explains variation within C00.

**Key findings**:
1. Signature changes are caused by global model state, not local topology or feature type specifically.
2. Fillet and chamfer share a common property that affects token signatures.
3. Hole models do not have this property.
4. Token signatures encode information about global model state, not just local face properties.

**Files tested**: C00, C03, C04, C05, C09, C10, C11

**Faces/models tested**: 41 faces across 6 models (C10 unparseable)

**Confidence**: High for structural observations. Medium for semantic interpretation (global model state mechanism unknown).

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP033.md`, `v0.4.7/EXP033_FEATURE_STATE.json`, `v0.4.7/EXP033_SUMMARY.md`

### CORRECTION NOTE (2026-08-14, Archivist Audit)

**"H4 (adjacency) FALSIFIED" is not a genuine test of topological adjacency and should not be relied upon.**

`isAdjacentToModified()` in `v0.4.7/exp033_feature_state.js` (lines 122–140) tests only whether a face shares an **orientation label** with a directly-modified face — its own source comment states "This is a simplification - true adjacency would require topology analysis." On an axis-aligned cube, no two distinct faces ever share an orientation, and the fillet/chamfer face itself is `NON_AXIS`, so this function is structurally incapable of ever returning `true` for +X/+Y against a fillet/chamfer/hole feature, regardless of real edge-sharing topology. Geometrically, a fillet/chamfer along the edge shared by the +X and +Y faces is, by construction (SolidWorks edge features operate on an edge shared by exactly two faces), adjacent to both faces. The claim "signature changes occur without adjacency" (§5.4, §6.3 of the evidence file) is therefore **not established** by this experiment; real topological adjacency was never measured. The "Adjacent to Modified" counts in EXP-033 §4.4 use the same flawed heuristic and should not be cited as adjacency counts.

This does not affect EXP-033's H1/H2/H3/H5/H6 conclusions, which do not depend on `isAdjacentToModified()`.

Downstream: `OPEN_QUESTIONS.md` OQ-032/OQ-033 restate "without adjacency" — corrected there. `FAILED_HYPOTHESES.md` FH-031 records this as Falsified/Confidence:High — corrected there (status downgraded to reflect that the test was invalid, not that the hypothesis was confirmed).

**Recommended fix if corpus becomes available:** replace the orientation-collision heuristic with a real edge/vertex-sharing adjacency check computed from vertex coordinates (available in the same face records), then re-run H4.

See `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Finding A).

---

## EXP-034: Controlled Transformation Invariance of Block1/Block2

**Status**: Complete

**Goal**: Determine whether the validated Block1/Block2 token structures are invariant under known geometric transformations (scale, translation) when topology and feature state remain unchanged.

**Method**: Compared C00 (baseline), C01 (2x scale), C02 (50mm translate) for all face structures: Block1 header/body, Block2 header/body, ec/vc/secCount/b1Len, gap markers, loop sizes, section lens, vertex coordinates, marker offsets.

**Evidence / facts**:

- **Block1 tokens are COMPLETELY INVARIANT**: All Block1 body tokens identical across C00/C01/C02 for all 6 faces (18 comparisons).
- **Block2 is COMPLETELY INVARIANT**: All Block2 body values identical across C00/C01/C02 for all 6 faces.
- **Structural properties are INVARIANT**: ec=4, vc=4, secCount=1, b1Len=6 identical across all models.
- **Block1/Block2 headers are INVARIANT**: [4,8,2,6] and [4,8,2,1] respectively.
- **Gap markers, loop sizes, section lens are INVARIANT**: All identical across models.
- **Marker offsets are INVARIANT**: All face positions identical (Face 0: 5140, Face 1: 6024, etc.).
- **Vertex coordinates CHANGE as expected**: C01 shows 2x ratio, C02 shows 50mm offset.
- **Byte-level differential**: C00 vs C01 = 355 bytes (2.95%), C00 vs C02 = 1141 bytes (9.47%). All changes in vertex coordinate regions.
- **All invariants PASS**: INV-005/006/008/009/016/017/018 all pass across all models.
- **H1 (Block1 invariant under scale)**: SUPPORTED.
- **H2 (Block1 invariant under translation)**: SUPPORTED.
- **H3 (Block2 invariant under scale)**: SUPPORTED.
- **H4 (Block2 invariant under translation)**: SUPPORTED.
- **H5 (structural properties invariant)**: SUPPORTED.
- **H6 (vertex coordinates encode geometry)**: SUPPORTED (expected).

**Key findings**:
1. Block1/Block2 structures are invariant under geometric transformations (2× scaling and translation).
2. Geometric transformations (scale, translate) do NOT affect Block1/Block2 tokens.
3. Only vertex coordinates change under geometric transformations.
4. This clarifies EXP-033: ordinary geometric transformations do NOT produce token-signature changes.
5. Block1 tokens are NOT vertex indices, NOT coordinate-dependent, NOT geometry-encoded.
6. **Unknown:** Exact semantic meaning of Block1/Block2 tokens.
7. **Not established:** That Block1/Block2 specifically encode topology.

**Files tested**: C00, C01, C02

**Faces/models tested**: 18 face comparisons across 3 models (6 faces each)

**Confidence**: High for structural invariance claims. All 18 face comparisons show identical Block1/Block2 tokens.

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP034.md`, `v0.4.7/EXP034_TRANSFORMATION_INVARIANCE.json`, `v0.4.7/EXP034_SUMMARY.md`

---

## EXP-035: Shell Feature Token Analysis

**Status**: Complete

**Goal**: Determine whether the shell operation produces Block1/Block2 token-signature changes in the remaining faces, and whether those changes resemble the fillet/chamfer behavior observed in EXP-033.

**Method**: Parsed C10 (shell) and C00 (baseline). Investigated why C10 was reported as "no parseable faces" in EXP-033. Compared Block1 tokens for corresponding faces. Tested hypotheses H1-H4.

**Evidence / facts**:

- **C10 IS parseable**: Parser extracted 11 faces from C10, all passing INV-016/017/018.
- **EXP-033 failure was a tooling/filtering issue**: The EXP-033 script filtered on `faceType === 'planar_cube'`, but C10's Face 0 has `faceType=planar_other` (ec=10, vc=10). Faces 1-10 have `faceType=planar_cube`.
- **C10 has 11 faces**: 5 original outer faces (Faces 1-5), 1 modified top face (Face 0, ec=10, vc=10, multi-loop), 5 new inner wall faces (Faces 6-10).
- **Original outer faces are TOKEN-IDENTICAL to C00**: All 5 original outer faces (Faces 1-5) have IDENTICAL Block1 tokens to C00.
- **New inner wall faces have unique tokens**: All 5 new inner faces (Faces 6-10) have unique token signatures not found in C00.
- **Shell does NOT change tokens on existing faces**: Original outer face tokens are identical to C00.
- **All C10 faces pass structural invariants**: INV-016 and INV-018 pass for all 11 faces.
- **H1 (shell causes changes)**: FALSIFIED.
- **H2 (shell no changes)**: SUPPORTED.
- **H3 (distinct pattern)**: NOT APPLICABLE.
- **H4 (outside extraction model)**: FALSIFIED.

**Key findings**:
1. C10 IS parseable under the validated extraction model.
2. EXP-033's "no parseable faces" was a filtering issue, not a structural failure.
3. Shell does NOT change tokens on existing outer faces.
4. Shell adds 5 new inner wall faces with unique token signatures.
5. Shell modifies the +Z face from ec=4/vc=4 to ec=10/vc=10 (multi-loop).
6. Fillet/chamfer are unique in producing global token changes; shell and holes do not.

**Files tested**: C00, C10

**Faces/models tested**: 17 faces across 2 models (6 + 11)

**Confidence**: High for original outer face invariance. High for new inner face uniqueness. High for structural invariant compliance.

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP035.md`, `v0.4.7/EXP035_RESULTS.json`, `v0.4.7/EXP035_SUMMARY.md`

---

## EXP-036: Fillet/Chamfer vs Hole/Shell Structural Differential

**Status**: Complete

**Goal**: Identify the concrete structural difference between C03/C09 (fillet/chamfer) which cause global token-signature changes, and C04/C05/C11 (holes) and C10 (shell) which do not.

**Method**: For each feature model against C00, characterized number of faces added/removed, face types, ec/vc/secCount distributions, Block1/Block2 sizes, which faces retain identical tokens, which faces receive changed tokens, and whether new faces have distinctive structural properties.

**Evidence / facts**:

- **Fillet/chamfer add a new face at an edge location**: C03/C09 have 1 added face. C04/C05/C10/C11 have 0 added faces.
- **Fillet/chamfer produce token changes on unrelated faces**: +X/+Y faces have IDENTICAL structural properties but different tokens. Holes/shell do NOT produce token changes on unrelated faces.
- **Multi-loop faces do NOT distinguish the groups**: C09 (chamfer) has 0 multi-loop faces but produces global token changes. C04/C05/C11 (holes) have 2 multi-loop faces but do NOT produce global token changes.
- **Face count does NOT distinguish the groups**: All models except C10 have 7 faces.
- **Block1 size correlates**: Fillet/chamfer have smaller avg B1 sizes (10.14) than holes/shell (37.34). But C10 (shell) has small B1 (7.1) similar to fillet/chamfer.
- **H1 (external boundary modification)**: FALSIFIED. Shell modifies external boundary but does not cause global token changes.
- **H2 (number of faces)**: FALSIFIED. All models except C10 have 7 faces.
- **H3 (multi-loop faces)**: FALSIFIED. C09 has 0 multi-loop faces but produces global token changes.
- **H8 (adding a new face at an edge)**: SUPPORTED. C03/C09 add a new face; C04/C05/C10/C11 do not.

**Key findings**:
1. Fillet/chamfer add a new face at an edge location. Holes/shell do not.
2. Fillet/chamfer produce token changes on +X/+Y faces with identical structural properties.
3. Multi-loop faces do NOT distinguish the groups.
4. Face count does NOT distinguish the groups.
5. The distinguishing factor is adding a new face at an edge location.

**Files tested**: C00, C03, C04, C05, C09, C10, C11

**Faces/models tested**: 52 faces across 7 models

**Confidence**: High for the observation that fillet/chamfer add a new face while holes/shell do not. High for the observation that fillet/chamfer produce token changes on unrelated faces while holes/shell do not. Medium for the hypothesis that adding a new face at an edge is the distinguishing factor.

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP036.md`, `v0.4.7/EXP036_RESULTS.json`, `v0.4.7/EXP036_SUMMARY.md`

### CORRECTION NOTE (2026-08-14, Archivist Audit)

**The quantitative "added" column in the Cross-Model Analysis table is unreliable and should not be cited as evidence.**

`computeTokenDiff()` in `v0.4.7/exp036_feature_class_differential.js` (lines 104–191) buckets faces by orientation label and only classifies a model face as `'added'` if its orientation is entirely absent from C00's 6 occupied buckets. Verified directly against `v0.4.7/EXP036_RESULTS.json`: `structuralComparison.C04_cube_hole_5mm.tokenDiffSummary.added = 0` and `structuralComparison.C10_cube_shell_1mm.tokenDiffSummary.added = 0`, with empty `addedFaceDetails` in both — even though C04 genuinely gained a 7th (cylindrical) face and C10 genuinely gained 5 new inner-wall faces (both independently established: C04's face count in `CORPUS_AUDIT.json`/EXP-027's "+1 face" language; C10's 5 new faces directly in EXP-035, `knowledge/evidence/2026-08-14_v0.4.7-EXP035.md`). Both new-face sets were silently dropped from the diff because their orientation labels collided with an already-occupied C00 bucket (a hole's near-zero-average-normal cylindrical face, and shell's inward-facing walls that mirror an existing outer wall's bucket) and lost the greedy best-match competition. Only the fillet/chamfer's new face happens to land on a genuinely novel `NON_AXIS(...)` orientation, which is why it is the only one detected.

Consequence: the table's claim `added: avg=1.00 (fillet/chamfer) vs avg=0.00 (holes/shell) — Distinguishes: YES` is misleading — holes and shell add faces too; the metric just fails to see it. "Adds a face" is therefore **not, by itself,** what distinguishes fillet/chamfer from hole/shell in this corpus (all four feature types add at least one face). What may still distinguish them — untested directly here — is whether the added face shares an edge with a **pre-existing** face (splitting that face's original boundary) versus being bounded entirely by brand-new edges. EXP-036 itself is appropriately conservative about this: H4 (Topology), H6 (Serialization position), and H7 (Feature type) are correctly marked **UNKNOWN**, not falsified, and H8 ("adding a new face at an edge") is offered as a plausible domain-informed inference (fillet/chamfer are CAD "edge features" by definition) rather than as something this script directly measured.

This does not overturn EXP-036's core qualitative finding — independently corroborated in EXP-033/EXP-035 by direct per-face comparison, not by this orientation-bucket algorithm — that +X/+Y token changes occur under fillet/chamfer and not under hole/shell. It does mean the "added" statistic should not be cited as supporting evidence for *why*.

See `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Finding B) and the confound analysis appended to `NEXT_QUESTIONS.md` NQ-027.

---

## EXP-037: NQ-028 — Edge-Location Discrimination + Corrected Adjacency/Correspondence Tooling

**Question**: NQ-028 — does moving a fillet/chamfer to a *different* physical cube edge move the Block1 token changes to the corresponding faces (spatial/adjacency, Hypothesis A), or do the same +X/+Y faces change regardless of feature location (global/feature-type state, Hypothesis B)?

**Status**: **NQ-028's core question NOT answered.** Before writing any analysis code, checked whether the existing corpus could answer it: the controlled-corpus SLDPRT files (`test files original/controlled/`) are absent from this repository and from the entire container filesystem (confirmed by search), and the archived JSON corpus contains exactly one fillet model (C03) and one chamfer model (C09), both confirmed (independently, via face-index tables in EXP-033 §4.3 and via this experiment's own vertex-based adjacency computation) to modify the *same* physical edge (shared by +X and +Y). No second-edge model exists anywhere. Per the task constraint against faking an answer from C03/C09, NQ-028 is left unanswered, and a full specification for the required new model (`C12_cube_fillet_1mm_edge2` or equivalent, 1mm fillet/chamfer on the edge shared by -X/-Y, all else identical to C00/C03/C09) is documented for a future session.

**What was done instead**, using only already-archived data (no SLDPRT files needed): built and validated a corrected, reusable adjacency + face-correspondence tool, addressing both defects flagged by the 2026-08-14 archivist audit as NQ-028 prerequisites.

- **Corrected face correspondence** (fixes Finding B / EXP-036's orientation-bucket bug): scores every (C00 face, feature-model face) pair by **centroid distance** rather than orientation label or raw vertex-overlap fraction (an initial vertex-overlap version produced tied, ambiguous scores between the true corresponding face and an unrelated face, because every cube corner is shared by three faces). Re-derives, with zero discrepancies against independently-established ground truth (EXP-027/EXP-035), that fillet/chamfer/hole/shell **all** add at least one new face: C03 +1, C09 +1, C04 +1 (cylindrical), C10 +5 (inner walls) — where EXP-036's algorithm reported 0 for the hole and shell.
- **Corrected adjacency** (fixes Finding A / EXP-033's same-orientation-label `isAdjacentToModified()`): counts genuinely shared vertices (≥2 = shares an edge) between faces, computed from the full per-face vertex coordinate arrays already archived in `VERTEX_ANALYSIS.json`. For both C03 and C09, the new feature face's real within-model adjacency set is exactly {+X, +Y, +Z, -Z} — i.e. the two directly-modified faces (+Z/-Z) plus the two faces whose token signature changed without direct modification (+X/+Y) — and excludes -X/-Y, whose tokens are unchanged.
- **Cross-check**: for the one edge this corpus contains, the real-adjacency set (computed from vertex coordinates) is **exactly equal** to the set of faces with a changed Block1 token array, for both fillet and chamfer. This upgrades "the +X/+Y faces that change are genuinely adjacent to the new feature face" from an unmeasured "by construction" assumption to a directly measured fact — but remains correlational (not causal) and single-edge (not general).
- **Contrast case (shell)**: shell's 5 new inner-wall faces ARE, by the same real-adjacency test, adjacent to several of its unmodified outer walls — yet EXP-035 independently established those outer walls keep identical tokens to C00. Real adjacency to a new face is therefore **not universally sufficient** for a token change across the feature types tested; the fillet/chamfer correlation does not generalize into a universal law.

**Hypotheses strengthened**: "+X/+Y faces changed in C03/C09 are genuinely topologically adjacent to the new feature face" (now measured, not assumed). "All four feature types tested add at least one new face" (now reproduced by a second, independent, geometry-based method).

**Hypotheses weakened/falsified**: None newly falsified. "Adjacency causes token change," if read as a *universal* cross-feature-type rule, is weakened by the shell contrast — scope-narrowed to "correlated for fillet/chamfer, on this edge," not falsified for that narrower claim.

**Files tested**: No SLDPRT files (none available). Data sources: `v0.4.7/VERTEX_ANALYSIS.json`, `v0.4.7/EXP033_FEATURE_STATE.json`, `v0.4.7/EXP035_RESULTS.json` — covering C00, C03, C04, C09, C10.

**Faces/models tested**: 56 face-records across 4 model pairs (C00↔C03, C00↔C09, C00↔C04, C00↔C10).

**Confidence**: High for the corrected added-face census (reproduces independent ground truth with zero discrepancies). Strong Evidence (not Verified — single edge, correlational) for the real-adjacency-equals-token-change-set finding. None for NQ-028's core edge-location-generality question — explicitly not attempted; requires new data.

**Date last updated**: 2026-08-14

**Raw evidence**: `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md`, `v0.4.7/EXP037_RESULTS.json`, `v0.4.7/EXP037_SUMMARY.md`, `v0.4.7/exp037_edge_location_and_adjacency.js`
