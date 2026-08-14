# Research Dashboard

Permanent project-wide knowledge base for the SLDPRT reverse-engineering project.

Branch-local notebooks remain under version directories such as `v0.3.5/docs/research/`. This `knowledge/` directory is the durable cross-version record.

---

## Current Research Posture

**Primary goal**: Recover the grammar of SLDPRT binary serialization well enough to build a read-only parser.

**Current phase**: Block1/Block2 token-semantics investigation via a controlled single-feature corpus (v0.4.7, EXP-027–036), following the earlier alternative-header/serialization-container analysis (v0.4.3–v0.4.4, corrected in v0.4.5 — see Recently Falsified Or Corrected below). v0.4.7 established that fillet/chamfer (but not hole/shell) produce Block1 token changes on faces structurally unrelated to the feature ("global model state" effect, EXP-033/035/036), but a 2026-08-14 archivist audit found the leading explanation ("adding a new face at an edge") is not yet cleanly isolated from confounds — see `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` and NQ-027/NQ-028. The first implementation phase (`parser/v0.1`, originally produced as v0.5) is a read-only geometry parser and viewer built on the validated state through v0.4.6 (see Implementation Milestones below); it does not yet incorporate any v0.4.7 findings, none of which are invariant-level. Parser-first, converter-second rule (above) still applies — `parser/v0.1` has no writer.
**Active research queue**: `NEXT_QUESTIONS.md`

**Rules**:

- Parser first, converter second.
- Syntax before semantics.
- Never assign semantic names without evidence.
- Every important conclusion must state status, evidence, tested files, tested counts, confidence, and date.
- Historical evidence is append-only. Do not delete old evidence; supersede it with newer entries.
- Every numerical claim must be reproducible from archived evidence.
- Open questions are broad unknowns. Next questions are concrete research queue items.
- Do not silently upgrade hypotheses into verified conclusions.
- Preserve raw experiment output under `knowledge/evidence/`.
- Git operations are only performed when explicitly instructed.

---

## High-Confidence Findings

- Modern readable geometry is in `Contents/DisplayLists`.
- Face blocks contain positions, a gap marker, normals, Block 1, and Block 2.
- The gap marker is `[12, 100, 2, vertexCount]`.
- Block 2 decodes loop vertex counts with `(raw + 2) / 2`.
- Decoded Block 2 loop counts sum to face vertex count for 595/595 tested faces.
- Block 1 starts with ONE for 595/595 tested faces.
- Block 1 ONE count equals Block 2 entry count for 1,234/1,234 tested faces.
- Block 1 ONE values are singleton runs.
- Block 1 body length follows `b1len = 2 × (vertexCount − sectionCount)` (INV-016, 1,234/1,234 validated faces).
- Every ONE-delimited section body token count equals `Block2[i] − 1` (INV-017, 8,763/8,763 sections, 1,234/1,234 faces). Independently reproduced by separate implementation (EXP-016).
- Sum of Block 2 values equals Block 1 body length (INV-018, 1,234/1,234 faces). **Note:** INV-018 is a mathematical consequence of INV-017, not an independent invariant. Retained as a derived relationship for convenience. See INV-018 dependency note.

See `KNOWN_INVARIANTS.md` for evidence details.

---

## Main Unknowns

- The exact grammar of Block 1.
- The meaning of each ONE-delimited Block 1 segment.
- The role, if any, of ZERO/ONE/VALUE token classes; VALUE semantics are currently UNKNOWN.
- Whether Block 1 is better modeled as grammar or opcode/operand bytecode.
- The meaning of DisplayLists `[1,1]` section-like structures.
- The structure of metadata streams such as LWDATA and unresolved high-entropy streams such as `Config-0-Partition`.
- Section length alone does not uniquely determine token-class sequence (only 30.2% of lengths have a single unique pattern).
- Why structurally equivalent faces require position-dependent VALUE mappings in some file pairs but only a global bijection in others (OQ-012).
- Whether the deterministic VALUE rewrite function can be expressed as arithmetic (OQ-013).
- **What does the `[4,8,2,N]` pattern mean?** Present 3,516 times across DisplayLists (0.96/KB). N ranges 1-9636 (175 distinct values). Not exclusive to faces. Semantics unknown.
- **What determines which faces get the `[4,8,2,N]` outer container?** 56.4% have it. Some files 0% (HEADPHONE), some 92.9% (PTC). VC=4,8,10 strongly correlated but not proven causal. **UPDATE (2026-08-13, INV-019):** a much tighter, exceptionless correlation exists between secCount and alternative-header presence/N-value (secCount=1⟺N=1, secCount=2⟺N=2, secCount>=3⟺none; 0/1,172 counterexamples, confirmed by dedicated counterexample hunt EXP-026). Still a correlation only — causal direction and semantics remain unresolved. See INV-019, OQ-018.
- **What is the N=2 body[0] value at mp-8?** Overwhelmingly `3` (80.3%). Not prev_edgeCount, not ec, not vc. Semantics unknown.
- **What is the correct B2 offset?** B2 read at `block1Start + b1w0 * 4` (used by EXP-023/024) appears wrong. Correct offset may include B1 header (4 or 8 bytes). B2 section-length model may be incomplete. **RESOLVED (2026-08-13, v0.4.5).** Root cause: EXP-023/024 read `block1Start + 0` (the header's constant tag word, always `4`) and mislabeled it `N`, so `block1Start + b1Word0*4` always evaluated to `block1Start + 16` — the start of Block1's own body, not Block2. Corrected formula (already established by EXP-018/021, INV-005): `block2Start = block1Start + (N + 4) * 4`, with `N` read from `block1Start + 12` after validating the header shape `[4,8,2,N]`. At the corrected offset, Block2 header is valid for 1,172/1,172 faces (100%), and INV-016/017/018 all pass 100%. See `v0.4.5/CORRECTION_NOTE.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP023-corrected.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP024-corrected.md`.
- **Why do EXP-022/025 have identical but separate script files?** Redundant. Should be consolidated.

See `OPEN_QUESTIONS.md`.

---

## Active Experiments

- NQ-001: Can Block 1 be parsed by a finite-state grammar over observed section forms?
- NQ-002: Do ONE-delimited Block 1 segment lengths correlate with Block 2 loop vertex counts?
- NQ-004A: Can the property-table falsification evidence be reproduced and archived?
- NQ-027: Why does adding a new face at an edge correlate with global token-signature changes? **See 2026-08-14 audit note in `NEXT_QUESTIONS.md` before pursuing — premise has unresolved confounds.**
- NQ-028 (new, 2026-08-14): Does fillet/chamfer applied to a *different* cube edge move the affected faces? Smallest discriminating test for NQ-027. Not yet run.

## Completed Experiments

- NQ-002A: `len = 2 * loopSize - 2` verification. **Answer:** Formula corrected to `len = 2 * loopSize - 3` (INV-017). Verified 8,763/8,763 sections. INV-012's original formula documented as incorrect (see correction note).
- **EXP-030**: Block1 Token Structural Correspondence. **Result:** No structural correspondence found for any tested candidate (vertex indices, edge counts, loop sizes, Block2 values). Cylindrical face pattern (150, 153) is a structural signature. Cube face tokens are a structural signature. B1Len formula explained. See `knowledge/evidence/2026-08-14_v0.4.7-EXP030.md`.
- **EXP-031**: Block1 Token Signature Classification. **Result:** Cylindrical faces share identical token signature (alternating 150/153). Planar cube faces have diverse token signatures. Token signatures partially correlate with face type. H1 (planar faces share one signature) FALSIFIED. H2 (cylindrical faces share one signature) SUPPORTED. H4 (geometry dimensions determine signature) FALSIFIED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP031.md`.
- **EXP-032**: Token Signatures vs Face Orientation. **Result:** Token signatures correlate with face orientation for planar cube faces. Token signatures are influenced by model type (fillet/chamfer features). Cylindrical faces share structural token signature regardless of orientation. H2 (orientation invariance) FALSIFIED. H4 (serialization position) FALSIFIED. H5 (topology/vertex ordering) FALSIFIED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP032.md`.
- **EXP-033**: Token Signatures vs Feature-Induced Model State. **Result:** Fillet and chamfer produce identical signature changes for +X and +Y. Signature changes occur without structural changes (ec/vc/secCount/b1Len identical). Signature changes occur without direct modification or adjacency. Hole models do NOT produce signature changes. H1 (feature type) SUPPORTED. H2 (local topology) FALSIFIED. H3 (direct modification) FALSIFIED. H4 (adjacency) FALSIFIED. H5 (global model state) SUPPORTED. H6 (orientation plus structural variable) SUPPORTED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP033.md`.
- EXP-012: Rewrite system analysis — position-dependent mapping discovered.
- EXP-013: Stress test of currently testable invariants — all survive on 1,232 faces (8 files).
- EXP-014: Reviewer criticism audit — circularity confirmed, DEKOR faces resolved, INV-018 dependency proven, INV-012 formula corrected.
- EXP-015: Non-circular validation — strengthens INV-005/006 confidence with documented remaining assumptions.
- EXP-016: Independent implementation reproducing INV-016/017/018 — 1,234/1,234 faces pass.
- EXP-017: Expanded corpus test (vc<=6000) — 2 previously-excluded DEKOR faces confirmed genuine.
- **EXP-018**: Independent face extraction — 1,234 FULL candidates match previous parser exactly. Gap marker analysis: all genuine faces have exact match [12,100,2,vc].
- **EXP-019**: Normal/Layout falsification — **CRITICAL REVIEW: Only H1 (normals are unit vectors) was a genuine test. H2/H3/H5 are tautological (test variable definitions, not data).** Alternative B1 positions still valid: 332 non-B2 alternatives across 1,234 faces.
- **EXP-020**: Geometry validation — blocked by missing `pako` dependency.
- **EXP-021**: Alternative [4,8,2,N] header investigation — 332 alternatives (332/1,234 faces, 26.9%). Delta formula proven: `delta = -48 - 24*vc - 4*N`. **N=2 body[0]=prev_edgeCount claim FALSIFIED** — 292/299 cross-face checks fail (97.7%). Body[0] is overwhelmingly `3` (80.3%), semantics unknown.
- **EXP-022**: Global container survey — 3,516 [4,8,2,N] patterns across 7 files. **Classification logic structurally broken** — offset math in FACE_B1/FACE_HEADER checks cannot reach face markers from container positions. 100% UNKNOWN classification is a foregone conclusion.
- **EXP-023**: Alternative header characterization — 661/1,172 faces (56.4%) have alternatives. VC=4,8,10 strongly correlated. **Section count data unreliable** — B2 read offset wrong by 4-8 bytes; secCount=0 for ALL 1,172 faces.
- **EXP-024**: Rejected candidate audit — 4,688 candidates, 0 VALID. **Methodological artifact** — same B2 offset bug causes 100% B2 failure. INV-016/017/018 never execute. Result contradicts EXP-023 (unacknowledged).
- **EXP-025**: Serialization primitive frequency — **redundant with EXP-022.** Same corpus, same scan, same classification bug.
- **EXP-023-CORRECTED / EXP-024-CORRECTED** (v0.4.5): Reran EXP-023/024 with the Block1→Block2 offset bug fixed (see Recently Falsified Or Corrected below). Block2 header now valid for 1,172/1,172 faces (100%, was 0%). `secCount` no longer degenerate; matches an independent INV-009 cross-check 1,172/1,172. EXP-024 now reports 1,172/4,688 VALID (was 0), exactly matching EXP-023's face count and resolving the previously unacknowledged EXP-023/EXP-024 contradiction. INV-016/017/018 all pass 100% (1,172/1,172) under the corrected pipeline — corroborating these invariants on a third independent implementation. New observation: `secCount` and alternative-header presence/N-value correlate with zero exceptions across all 1,172 faces (`secCount=1`⟺altN=1, `secCount=2`⟺altN=2, `secCount>=3`⟺no alternative) — recorded as correlation only, no semantic interpretation assigned. See `v0.4.5/SUMMARY.md`, `v0.4.5/CORRECTION_NOTE.md`.
- **EXP-026** (v0.4.6): Narrow OQ-018 discriminating test. Independently re-derived the 1,172-face set (v0.4.5-corrected offset formula, not the buggy v0.4.4 arithmetic) and hunted for counterexamples to the secCount/alternative-header correlation in 4 directions. **0 counterexamples found**, across all 1,172 faces and all 7 files individually. Correlation recorded as INV-019 (Status: Correlation, not causal). Causality and semantics remain unresolved; alternative-header detection window (N∈{1,2} at fixed offsets) not extended. See `v0.4.6/SUMMARY.md`.
- **EXP-027** (v0.4.7): Binary differential analysis of controlled corpus. 9 controlled pairs (scale, translation, hole diameter/position, fillet, chamfer, shell) compared at byte level and vertex level. Key findings: (1) vertex positions are Float32, scale/translation are pure position transformations (2.95%/9.47% diffs, 0 structural changes); (2) feature operations change face counts and vc/ec (36-75% diffs, +1 to +5 faces); (3) hole diameter affects cylindrical surface vc (approximately linear scaling); (4) feature operations are localized to affected faces. All 85 faces pass INV-016/017/018. See `v0.4.7/SUMMARY.md`, `knowledge/evidence/2026-08-14_v0.4.7-EXP027.md`.
- **EXP-028** (v0.4.7): Validation/falsification of EXP-027 conclusions. Three investigations: (1) **Hole-diameter relationship FALSIFIED** — vc ratio 70/56=1.25 ≠ diameter ratio 5/3=1.67; "linear scaling" claim rejected. (2) **Feature-change localization WEAKENED** — binary diffs dominated by inter-face metadata (50-80%); DL re-serialized entirely on face changes. (3) **Vertex correspondence FALSIFIED** — SLDPRT↔STEP exact matches only 3-12.5%; vertices are tessellated approximations (~10μm offset), not exact B-rep. See `knowledge/evidence/2026-08-14_v0.4.7-EXP028.md`.
- **EXP-029** (v0.4.7): Block1/Block2 geometry-encoding differential. Tested whether Block1 tokens encode geometry-specific data using controlled corpus. **Key findings**: (1) Cube face tokens identical across C00/C03/C04/C09 — tokens NOT random. (2) Cylindrical face tokens identical up to length between C04/C05 — tokens do NOT encode diameter. (3) Token length = 2*vc-2 (INV-017) — structural invariant. (4) Face matching ambiguous (6 faces with same ec/vc/secCount). **Geometry encoding hypothesis FALSIFIED** for cylindrical faces. See `knowledge/evidence/2026-08-14_v0.4.7-EXP029.md`.
- **EXP-030** (v0.4.7): Block1 Token Structural Correspondence. **Result:** No structural correspondence found for any tested candidate (vertex indices, edge counts, loop sizes, Block2 values). Cylindrical face pattern (150, 153) is a structural signature. Cube face tokens are a structural signature. B1Len formula explained. See `knowledge/evidence/2026-08-14_v0.4.7-EXP030.md`.
- **EXP-031** (v0.4.7): Block1 Token Signature Classification. **Result:** Cylindrical faces share identical token signature (alternating 150/153). Planar cube faces have diverse token signatures. Token signatures partially correlate with face type. H1 (planar faces share one signature) FALSIFIED. H2 (cylindrical faces share one signature) SUPPORTED. H4 (geometry dimensions determine signature) FALSIFIED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP031.md`.
- **EXP-032** (v0.4.7): Token Signatures vs Face Orientation. **Result:** Token signatures correlate with face orientation for planar cube faces. Token signatures are influenced by model type (fillet/chamfer features). Cylindrical faces share structural token signature regardless of orientation. H2 (orientation invariance) FALSIFIED. H4 (serialization position) FALSIFIED. H5 (topology/vertex ordering) FALSIFIED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP032.md`.
- **EXP-033** (v0.4.7): Token Signatures vs Feature-Induced Model State. **Result:** Fillet and chamfer produce identical signature changes for +X and +Y. Signature changes occur without structural changes (ec/vc/secCount/b1Len identical). Signature changes occur without direct modification or adjacency. Hole models do NOT produce signature changes. H1 (feature type) SUPPORTED. H2 (local topology) FALSIFIED. H3 (direct modification) FALSIFIED. H4 (adjacency) FALSIFIED. H5 (global model state) SUPPORTED. H6 (orientation plus structural variable) SUPPORTED. See `knowledge/evidence/2026-08-14_v0.4.7-EXP033.md`.
- **EXP-034** (v0.4.7): Controlled Transformation Invariance of Block1/Block2. **Result:** Block1 tokens are COMPLETELY INVARIANT under scale (C00→C01) and translation (C00→C02). Block2 is COMPLETELY INVARIANT. Structural properties (ec/vc/secCount/b1Len) are INVARIANT. Only vertex coordinates change. Byte-level differential: C00 vs C01 = 355 bytes (2.95%), C00 vs C02 = 1141 bytes (9.47%). All invariants (INV-005/006/008/009/016/017/018) PASS. **Strong evidence:** Block1/Block2 structures are independent of the tested absolute vertex coordinates. Unknown: exact semantic meaning. Not established: that they specifically encode topology. Clarifies EXP-033: ordinary geometric transformations do NOT produce token-signature changes. See `knowledge/evidence/2026-08-14_v0.4.7-EXP034.md`.
- **EXP-035** (v0.4.7): Shell Feature Token Analysis. **Result:** C10 IS parseable (11 faces, all pass INV-016/017/018). EXP-033's "no parseable faces" was a filtering issue. Shell does NOT change tokens on existing outer faces (5/5 IDENTICAL to C00). Shell adds 5 new inner wall faces with unique token signatures. Shell modifies +Z face from ec=4/vc=4 to ec=10/vc=10. H1 (shell causes changes) FALSIFIED. H2 (shell no changes) SUPPORTED. H4 (outside extraction model) FALSIFIED. Key finding: fillet/chamfer are unique in producing global token changes; shell and holes do not. See `knowledge/evidence/2026-08-14_v0.4.7-EXP035.md`.
- **EXP-036** (v0.4.7): Fillet/Chamfer vs Hole/Shell Structural Differential. **Result:** Fillet/chamfer add a new face at an edge location; holes/shell do not. Fillet/chamfer produce token changes on +X/+Y faces with IDENTICAL structural properties; holes/shell do not. Multi-loop faces do NOT distinguish the groups (C09 has 0, C04/C05/C11 have 2). Face count does NOT distinguish (all 7 except C10). H1 (external boundary) FALSIFIED. H2 (face count) FALSIFIED. H3 (multi-loop) FALSIFIED. H8 (adding new face at edge) SUPPORTED. Distinguishing factor: adding a new face at an edge location. See `knowledge/evidence/2026-08-14_v0.4.7-EXP036.md`. **CORRECTED (2026-08-14, Archivist Audit):** the "added: 0 for holes/shell" statistic behind H8 is a measurement artifact (orientation-bucket collision bug); holes and shell add faces too (established independently by EXP-035/EXP-027). "Adds a face" is not the true discriminator; "adds a face at an edge" is not yet directly measured (no topology/adjacency computation exists in this codebase) and should be treated as Hypothesis, not Supported. See below and `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`.
- **Archivist Audit of EXP-027→EXP-036** (2026-08-14): Skeptical re-audit of the binary-differential→Block1/Block2 token-investigation transition. Found and corrected: (1) EXP-033's H4 "adjacency FALSIFIED" used a same-orientation-label heuristic, not real topological adjacency — downgraded to Unknown/test invalid (FH-031, OQ-032/033 corrected). (2) EXP-036's "added" cross-model statistic silently drops genuinely new faces for hole/shell models (orientation-bucket collision), confirmed against raw JSON — the "adds a face" discriminator claim is not supported as stated (OQ-036, EXP-036 entry corrected). (3) EXP-027's "linear VC-diameter scaling" and "localized to affected faces" claims, falsified/weakened by EXP-028 the same day, had no in-place cross-reference — added. (4) The corpus tests only one physical edge location (C03/C09 both change face index 2/3) — location-generality of the "adds a face at an edge" effect is untested. No hypothesis from EXP-027–036 was found to have been silently promoted to `KNOWN_INVARIANTS.md` (checked; none were). See `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` and `knowledge/RESEARCH_HANDOFF.md`. New discriminating experiment recommended but NOT executed: NQ-028 (fillet/chamfer a different cube edge; see `NEXT_QUESTIONS.md`).
See `NEXT_QUESTIONS.md`.

---

## Implementation Milestones

- **parser/v0.1** (2026-08-13, originally produced as **v0.5** of the research progression; relocated to `parser/` on 2026-08-14): First read-only SLDPRT geometry parser and browser visualizer, built directly on the validated research state through v0.4.6. `parser/v0.1/src/parser-core.js` is an isomorphic (Node + browser) reimplementation of the corrected extraction pipeline (v0.4.5's Block1→Block2 offset formula, INV-016/017/018), plus an added INV-003-backed normals check. Passes exact parity against the v0.4.5/v0.4.6 reference data: 1,172/1,172 faces, per-face marker offset/edgeCount/vertexCount/secCount match exactly (`parser/v0.1/test/compare-with-reference.js`). Browser viewer (drag-and-drop, orbit/pan/zoom, shaded/wireframe/vertex/normal toggles, face selection with source-offset metadata, rejected-candidate reporting) verified functional against real corpus files in a real browser session. Does NOT reuse the pre-v0.4 heuristic extractors in `v0.2.x`/`v0.3.x` (predate the Block1/Block2 grammar research, rely on falsified loop-splitting heuristics — FH-005). Introduces one clearly-labeled, non-verified rendering hypothesis (`loopModel: 'sequential-assumed'`, sequential loop segmentation for triangulation) — see OQ-019. No writer/converter; read-only prototype only. See `parser/v0.1/README.md`, `parser/v0.1/SUMMARY.md`, `knowledge/evidence/2026-08-13_v0.5-parser-validation.md`.
---

## Recently Falsified Or Corrected

- FH-003: The gap marker contains loop boundaries.
- FH-005: Normal-gap loop splitting works.
- FH-006: Face blocks start with `[12, 100, 2, vertexCount]`.
- FH-011: Block 2 raw values are vertex indices.
- FH-012: DisplayLists contains only face data.
- FH-013: VALUE tokens encode a property table.
- INV-012: Formula `len = 2 * loopSize - 2` is incorrect (off by +1). Correction appended in-place.
- **EXP-019 H2/H3/H5**: Claimed "4/5 hypotheses survived." Only H1 (normals unit vectors) was a genuine test. H2/H3/H5 are tautologies — they test variable definitions, not data. **3 of the "surviving" hypotheses are invalid.** See `v0.4.4/FALSIFICATION_REVIEW.md`.
- **EXP-021 N=2 body[0] = prev_edgeCount**: Claim FALSIFIED. 292/299 cross-face checks fail (97.7%). Body[0] at mp-8 is overwhelmingly `3` (80.3%), not previous face's edgeCount. See `v0.4.3/docs/research/exp021_prev_edgecount_falsification.js`.
- **EXP-022/025 classification**: 100% UNKNOWN classification is a methodological artifact. FACE_B1/FACE_HEADER offset math is structurally incapable of detecting face-container [4,8,2,N] patterns. See `v0.4.4/FALSIFICATION_REVIEW.md`.
- **EXP-024 0 VALID**: Methodological artifact. B2 offset bug causes 100% failure at B2 validation; INV-016/017/018 never execute. Result contradicts EXP-023's 1,172 valid faces. See `v0.4.4/FALSIFICATION_REVIEW.md`.
- **CORRECTION (2026-08-13, v0.4.5)**: EXP-023's `secCount=0` and EXP-024's `0 VALID` are confirmed methodological artifacts of the same root cause: `block1Start + b1Word0*4` misread the header's constant first word (`4`) as the body length `N`, always landing on Block1's own body instead of Block2. Corrected offset (`block1Start + (N+4)*4`, with `N` read from `block1Start+12`) yields Block2-header-valid for 1,172/1,172 faces, `secCount` matching INV-009 for 1,172/1,172, and EXP-024 VALID = 1,172/4,688 — exactly matching EXP-023's face count, resolving the contradiction. INV-016/017/018 pass 100% under the corrected pipeline. The original v0.4.4 scripts, results, and evidence are unmodified; this is an additive corrected rerun. See `v0.4.5/CORRECTION_NOTE.md`, `v0.4.5/SUMMARY.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP023-corrected.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP024-corrected.md`.
- **FH-031 (2026-08-14, Archivist Audit): "Token signatures depend on adjacency" — downgraded from Falsified/High to Unknown (test invalid).** EXP-033's adjacency test (`isAdjacentToModified()`) heuristically checks for shared *orientation labels*, not real topological adjacency, and cannot detect true adjacency on the axis-aligned cube corpus regardless of ground truth. The original FH-031 entry is retained; a correction note is appended in place. See `FAILED_HYPOTHESES.md`, `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`.
- **EXP-036 "added" cross-model statistic (2026-08-14, Archivist Audit): unreliable, not a genuine face-addition count.** `computeTokenDiff()`'s orientation-bucket matching silently drops new faces that share an orientation label with an existing face — verified against raw JSON that this drops C04's new cylindrical face and all 5 of C10's new inner-wall faces (both independently confirmed added by EXP-027/EXP-035). "Adds a face" therefore does not distinguish fillet/chamfer from hole/shell as the EXP-036 table implies; "adds a face at an edge" remains an untested, domain-informed hypothesis. See `EXPERIMENT_LOG.md` EXP-036 correction note, `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`.
- **EXP-027 findings (3) and (4) (2026-08-14, Archivist Audit): falsified/weakened by EXP-028 with no prior in-place cross-reference — now added.** "Linear VC-diameter scaling" is FALSIFIED (ratio mismatch, EXP-028 Inv. 1); "localized to affected faces" is WEAKENED (DL fully re-serialized on any face change, EXP-028 Inv. 2). See `EXPERIMENT_LOG.md` EXP-027 correction note.

See `FAILED_HYPOTHESES.md` and INV-012 correction note in `KNOWN_INVARIANTS.md`.

---

## Current Corpus

| File | Short name | Notes |
| --- | --- | --- |
| `test files original/usb hub case (ultimate test)/USB hub case BOTTOM.SLDPRT` | BOTTOM | Openswx, 39 faces |
| `test files original/usb hub case (ultimate test)/USB hub case TOP.SLDPRT` | TOP | Openswx, 68 faces |
| `test files original/Helical Bevel Gear.SLDPRT` | GEAR | Openswx, 113 faces |
| `test files original/Dekor.SLDPRT` | DEKOR | Openswx, 375 faces (v0.4.0: 373 at vc<=5000; 375 at vc<=10000 — discrepancy resolved) |
| `untouched/Headphone Stand.SLDPRT` | HEADPHONE | Openswx, 62 faces. **New.** Contains MeshData stream. |
| `untouched/distributor main boss rev a.SLDPRT` | DISTRIBUTOR | Openswx, 51 faces. **New.** |
| `untouched/Pocket Wheel.SLDPRT` | POCKET | Openswx, 400 faces. **New.** Largest corpus file. |
| `untouched/PTC GE8080-8.SLDPRT` | PTC | Openswx, 126 faces. **New.** Contains FeatureBodies stream. |
| `test files original/SW2000-s01.SLDPRT` | SW2000 | OLE2, not parseable by current pipeline |
| `test files original/plate4.sldprt` | PLATE4 | OLE2, not parseable by current pipeline |
| `test files original/chainwheel.sldprt` | CHAINWHEEL | OLE2, not parseable by current pipeline |

Modern aggregate: 1,234 faces across 8 models (vc<=6000). All 17 currently testable invariants pass 100%. v0.4.0 2-face discrepancy resolved: the 2 DEKOR vc=5862 faces are genuine and pass all invariants (were excluded by an arbitrary vc<=5000 filter threshold).

---

## Repository Stewardship

Before proposing a commit:

- Review changed files and identify unrelated edits.
- Suggest logical commit boundaries.
- Identify files that should or should not be committed.
- Check for accidental debug output and generated files.
- Verify documentation matches implementation.
- Verify experiments referenced by documentation actually exist.

Commit report template:

```text
Summary:
Files changed:
Research impact:
Breaking changes:
Documentation status:
Recommended commit message:
```

---

## Maintenance Protocol

See `EVIDENCE_PRESERVATION_POLICY.md` for the mandatory evidence rules.

When adding a conclusion:

```text
Status:
Evidence:
Files tested:
Faces/models tested:
Confidence:
Date last updated:
```

When disproving a hypothesis:

1. Add or update the disproving experiment in `EXPERIMENT_LOG.md`.
2. Move the claim to `FAILED_HYPOTHESES.md`.
3. Remove or downgrade any conflicting entry in `ASSUMPTIONS.md` or `KNOWN_INVARIANTS.md`.
4. Add raw or summarized evidence under `knowledge/evidence/` when useful.

When adding a numerical claim:

1. Archive raw script output, corpus size, files analyzed, exact command/script used, and date produced.
2. Link the summary claim to the related experiment and evidence file.
3. If raw evidence is missing, explicitly record the evidence gap and add a `NEXT_QUESTIONS.md` reproduction item.

When adding a VALUE hypothesis:

1. Keep VALUE semantics at UNKNOWN unless a discriminating experiment supports the hypothesis.
2. Document at least one experiment that could distinguish the hypothesis from delimiter artifacts, frequency bias, and random-base controls.
3. Do not promote a VALUE hypothesis beyond Hypothesis without that discriminating evidence.

When adding a next question:

1. Add it to `NEXT_QUESTIONS.md`.
2. Link dependencies to experiments, assumptions, or open questions.
3. State what hypotheses it will eliminate or constrain.
4. Update `Active Experiments` here if it becomes active.

When adding a correction to an existing invariant or observation:

1. Do not delete or alter the original text.
2. Append a clearly marked correction note with the date.
3. State the old claim, the correct claim, and the evidence that justifies the change.
4. Link to the experiment and raw evidence.
5. Do not change the invariant's original status field; add a note in the correction that the status has been effectively changed.

When documenting a mathematical dependency:

1. Append a dependency note rather than deleting or downgrading the dependent entry.
2. Include the full derivation so the dependency can be checked independently.
3. State whether any counterexamples exist.
4. Retain the original entry for historical continuity.
