# Next Questions

> **2026-09-14 current-state correction — EXP-042–046:** Read [the v0.4.8 format report](../v0.4.8/README.md) before using the historical conclusions below. Block2 describes triangle strips, not CAD loops; Block1 annotates strip edges and links exactly to downstream edge IDs. The predecessor array is always present on the tested corpus. A third byte array and a forward metadata grammar are now recorded. `parser/v0.2` implements the verified read-only path. Old text is retained as evidence, not current guidance.

## NQ-030: Decode the optional scalar arrays and remaining surface records

**Status/date:** Open, 2026-09-14. EXP-045 reads the optional arrays and raw parameters but validates external geometry only for controlled planes/cylinders. Match appropriate independent surface exports before naming the arrays UV or naming remaining tag values. Evidence: [EXP-045](evidence/2026-09-14_v0.4.8-EXP045.md).

## NQ-031: Obtain a discriminating nonzero Block3 sample

**Status/date:** Open, 2026-09-14. All current payload bytes are zero. Try controlled visibility/edge-style changes only as candidate interventions; archive the real binaries and failed interventions too. No specific trigger is established. Evidence: [EXP-042](evidence/2026-09-14_v0.4.8-EXP042.md).

## NQ-032: Decode raw edge-type families and following object records

**Status/date:** Open, 2026-09-14. EXP-044/045 gives an ID bridge and raw 300x/480xx families. Establish curve-type/flag meaning against independent geometry, then parse the variable serialization following the edge table. Do not infer a universal packing formula from approximate numeric similarity.

## NQ-033: Validate container and body/configuration scoping

**Status/date:** Open, 2026-09-14. The new local grammar reuses the existing openswx decompressor. Directory-based discovery, CRC validation, duplicate stream/configuration policy and cross-body edge-ID namespaces remain unvalidated. This is distinct from the successful face-local grammar.

---

Historical queue follows; use the dated resolution notes and current handoff when prioritizing.

Operational research queue for the SLDPRT reverse-engineering project.

This is not the same as `OPEN_QUESTIONS.md`. Open questions describe broad unknowns. Next questions are concrete, experiment-driving questions that can be answered, falsified, or retired.

Each entry should include:

```text
Status:
Depends on:
If answered:
Will eliminate or constrain:
Evidence to archive:
Last updated:
```

Statuses:

- `Active`: current research priority.
- `Ready`: well-formed and ready to run.
- `Blocked`: requires missing tooling, data, or manual review.
- `Deferred`: valid, but not next in sequence.
- `Answered`: resolved by evidence; link experiment and conclusion.
- `Retired`: no longer useful because direction changed or premise failed.

---

## NQ-001: Can Block 1 Be Parsed By A Finite-State Grammar Over Observed Section Forms?

> **Correction, 2026-09-14 (EXP-042–046):** The corpus grammar is decoded as length-delimited strip-edge annotation sections; no inferred finite-state language is needed for these records. Evidence: [v0.4.8 report](../v0.4.8/README.md).

**Status**: Active

**Depends on**: EXP-006, EXP-007

**If answered**: Tests whether Block 1 can be described by observed section forms without assigning semantics to `VALUE` tokens.

**Will eliminate or constrain**: OQ-001, OQ-001A, OQ-002, OQ-004, OQ-010, OQ-011; ASM-003.

**Evidence to archive**: Segment token sequences by face, observed section forms, accepted/rejected form cases, per-file exception tables.

**Last updated**: 2026-06-27

---

## NQ-002: Do ONE-Delimited Block 1 Segment Lengths Correlate With Block 2 Loop Vertex Counts?

**Status**: Active

**Depends on**: EXP-004, EXP-006, EXP-007

**If answered**: Tests whether ONE-delimited segments are structurally paired with Block 2 loop entries beyond count equality.

**Will eliminate or constrain**: ASM-003, OQ-002, OQ-005 from branch-local notebook, OQ-010.

**Evidence to archive**: CSV/table with face id, vertex count, Block 2 decoded counts, ONE segment lengths, token-class histograms, mismatches.

**Last updated**: 2026-06-27

---

## NQ-002A: Does `len = 2 * loopSize - 2` Hold Across The Full Archived Corpus?

**Status**: Answered

**Depends on**: EXP-004, EXP-009, EXP-011

**Answer**: This formula has been verified as INV-017 (Verified Structural Invariant). For every ONE-delimited section, `sectionBodyTokenCount = Block2[i] - 1`, which is equivalent to `len = 2 * loopSize - 3`. Verified across 8,763/8,763 sections (100%) across 8 files by EXP-013, with independent reproduction by EXP-016.

**Note on INV-012 equivalence**: The original INV-012 formula `len = 2 * loopSize - 2` was found to be incorrect (off by +1). The correct equivalent is `len = 2 * loopSize - 3`. See INV-012 correction note for details.

**Evidence archive**: `knowledge/evidence/2026-06-27_v0.4.0-invariant-validation.md`, `knowledge/evidence/2026-07-10_v0.4.2-stress-test.md`, `knowledge/evidence/2026-07-10_v0.4.2a-independent-parser.md`

**Will eliminate or constrain**: OQ-001, OQ-001A, OQ-002, ASM-003.

**Evidence to archive**: Raw table with file name, face id, Block 2 loop size, observed Block 1 section length, formula result, and mismatch count.

**Last updated**: 2026-06-27

---

## NQ-003: Are SMALL Tokens In GEAR Structurally Localized?

**Status**: Ready

**Depends on**: EXP-006

**If answered**: Determines whether SMALL values are a rare grammar production, a file/model-specific feature, or an artifact of the token threshold.

**Will eliminate or constrain**: OQ-005, ASM-004.

**Evidence to archive**: List of faces containing SMALL tokens, token positions, surrounding token windows, section ids if available, face vertex counts, Block 2 loop counts.

**Last updated**: 2026-06-27

---

## NQ-004: Are `LARGE LARGE` Boundary Patterns A Distinct Block 1 Production?

**Status**: Ready

**Depends on**: EXP-006

**If answered**: Determines whether `LARGE LARGE` near segment/block boundaries is grammar, terminator-like structure, or incidental adjacency.

**Will eliminate or constrain**: OQ-003, OQ-004, OQ-010, ASM-004.

**Evidence to archive**: All `LARGE LARGE` occurrences by file/face/segment, boundary classification, preceding/following token windows, relation to Block 2 loop index.

**Last updated**: 2026-06-27

---

## NQ-004A: Can The Property-Table Falsification Evidence Be Reproduced And Archived?

**Status**: Active

**Depends on**: EXP-010, FH-013

**If answered**: Replaces today's handoff-only property-table falsification with reproducible project-wide evidence.

**Will eliminate or constrain**: OQ-003A, ASM-004, future VALUE hypotheses.

**Evidence to archive**: Raw script output for random-base controls, frequency-bias analysis, delimiter-artifact analysis, exact command/script, corpus size, files analyzed, and numeric results.

**Last updated**: 2026-06-27

---

## NQ-005: Can DisplayLists `[1,1]` Section Maps Be Completed For TOP And DEKOR?

**Status**: Ready

**Depends on**: EXP-008

**If answered**: Completes the current section-count corpus and tests whether BOTTOM/GEAR section behavior generalizes.

**Will eliminate or constrain**: OQ-008, ASM-005, INV-014 confidence level.

**Evidence to archive**: Section offsets, sizes, face counts per section, string/class-name hits, candidate marker counts, parsed face counts for TOP and DEKOR.

**Last updated**: 2026-06-27

---

## NQ-006: Can The Section-0 Contradiction Be Resolved By Byte-Level Re-Audit?

**Status**: Blocked

**Depends on**: EXP-008 raw section-map output, branch-local section audit scripts.

**If answered**: Resolves the documented inconsistency where one note says Section 0 has no face markers while another records GEAR Section 0 with 4 faces.

**Will eliminate or constrain**: INV-014, OQ-008, ASM-005.

**Evidence to archive**: Raw section map for BOTTOM and GEAR, exact Section 0 offset/range, face-marker offsets inside or outside Section 0.

**Last updated**: 2026-06-27

---

## NQ-007: Can R0/R1 Position-Normal Evidence Be Reproduced And Archived?

**Status**: Blocked

**Depends on**: Locating or recreating the R0/R1 comparison script/output.

**If answered**: Upgrades INV-003 from handoff-supported documentation to project-wide reproducible evidence.

**Will eliminate or constrain**: Any remaining ambiguity about position vs normal record interpretation.

**Evidence to archive**: Script name, input files, vector-length statistics, equality statistics, min/max component ranges, model/face counts.

**Last updated**: 2026-06-27

---

## NQ-009: Does Correcting The EXP-023/024 Block1->Block2 Offset Change Their Reported Results?

**Status**: Answered

**Depends on**: EXP-023, EXP-024, v0.4.4/FALSIFICATION_REVIEW.md, INV-005, EXP-018, EXP-021

**Answer**: Yes, substantially. The bug (EXP-023/024 read the Block1 header's constant first word, always `4`, and mislabeled it as the body length `N`, causing `block1Start + b1Word0*4` to always land on Block1's own body instead of Block2) was corrected using the already-established formula `block2Start = block1Start + (N+4)*4` with `N` read from `block1Start+12`. Results: (1) `secCount=0 for ALL 1,172 faces` is corrected -- at the right offset, Block2 header is valid for 1,172/1,172 faces and `secCount` matches an independent INV-009 cross-check 1,172/1,172. (2) `0 VALID candidates in EXP-024` is corrected -- 1,172/4,688 candidates are now VALID, exactly matching EXP-023's face count and resolving the previously unacknowledged contradiction between the two experiments. INV-016/017/018 all pass 100% under the corrected pipeline. (3) The `661/1,172 alternative-header correlation` is **unchanged** -- that detection logic never used the buggy offset. A new, exceptionless correlation was found between `secCount` and alternative-header presence/N-value (see OQ-018); this is recorded as an observation only, with no semantic meaning assigned.

**Evidence archive**: `v0.4.5/CORRECTION_NOTE.md`, `v0.4.5/SUMMARY.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP023-corrected.md`, `knowledge/evidence/2026-08-13_v0.4.5-EXP024-corrected.md`

**Will eliminate or constrain**: OQ-016 (answered), OQ-018 (new).

**Evidence to archive**: Corrected scripts, corrected raw JSON results, before/after comparison tables, root-cause analysis. (Complete -- see evidence archive above.)

**Last updated**: 2026-08-13

---

## NQ-010: Is The secCount / Alternative-Header Correlation (OQ-018) Exceptionless?

**Status**: Answered

**Depends on**: NQ-009, EXP-023-CORRECTED (v0.4.5), OQ-018

**Answer**: Yes, on the tested corpus. EXP-026 (v0.4.6) independently re-derived the 1,172-face set using the v0.4.5-corrected Block1/Block2 offset formula (not the buggy v0.4.4 arithmetic) and hunted for counterexamples in four directions: secCount=1 without an N=1 alternative; secCount=2 without an N=2 alternative; secCount>=3 with any alternative; alternative N inconsistent with secCount. Result: 0 counterexamples in all four directions, across all 1,172 faces and each of the 7 files individually. The correlation is recorded as INV-019 (Status: Correlation, not a proven causal or structural law). Causal direction and semantic meaning remain explicitly unresolved. The alternative-header detection window (N∈{1,2} at fixed offsets mp-20/mp-24) was not extended, and HEADPHONE (62 faces) was not tested (not present in this repository checkout) — both noted as known gaps, not resolved by this experiment.

**Evidence archive**: `v0.4.6/SUMMARY.md`, `knowledge/evidence/2026-08-13_v0.4.6-EXP026.md`, `knowledge/KNOWN_INVARIANTS.md` INV-019.

**Will eliminate or constrain**: OQ-018 (causal-direction question narrowed, not closed).

**Evidence to archive**: Corrected extraction script, raw per-face JSON, counterexample counts by direction and by file. (Complete — see evidence archive above.)

**Last updated**: 2026-08-13

---

## NQ-008: Can Normal-Gap Loop-Splitting Failure Be Reproduced And Archived?

**Status**: Deferred

**Depends on**: v0.3.0-v0.3.3 diagnostic scripts and representative files.

**If answered**: Strengthens FH-005 with raw evidence and exact corpus counts.

**Will eliminate or constrain**: Attempts to revive normal-discontinuity loop splitting without new evidence.

**Evidence to archive**: Diagnostic output showing false splits on strip diagonals, input files, face ids, threshold settings.

**Last updated**: 2026-06-27

---

## NQ-013: What Is the Exact VC-Diameter Relationship for Cylindrical Surfaces?

**Status**: Answered (relationship NOT linear)

**Depends on**: EXP-027, EXP-028

**Answer**: EXP-028 FALSIFIED the linear scaling hypothesis. C04 (5mm) vc=70, C05 (3mm) vc=56. Ratio 70/56=1.25 ≠ diameter ratio 5/3=1.67. With only 2 data points, exact relationship cannot be determined. Need third diameter (e.g., 4mm) to fit power law vc = a * diameter^b.

**Will eliminate or constrain**: OQ-021 (hole geometry encoding). Linear scaling rejected.

**Evidence to archive**: `v0.4.7/EXP028_HOLE_DIAMETER.json`, `knowledge/evidence/2026-08-14_v0.4.7-EXP028.md`.

**Last updated**: 2026-08-14

---

## NQ-014: Is the DisplayList Re-Serialized on Any Face Change?

**Status**: Answered (YES, re-serialized)

**Depends on**: EXP-027, EXP-028

**Answer**: EXP-028 confirmed that binary diffs are dominated by inter-face metadata (50-80%). Face start offsets shift globally when faces are added/modified. The entire DL is re-serialized, not just affected faces.

**Will eliminate or constrain**: OQ-022 (feature locality). Incremental parsing not possible.

**Evidence to archive**: `v0.4.7/EXP028_FEATURE_LOCALIZATION.json`, `knowledge/evidence/2026-08-14_v0.4.7-EXP028.md`.

**Last updated**: 2026-08-14

---

## NQ-015: Do SLDPRT Vertices Correspond to Exact STEP/STL Vertices?

**Status**: Answered (NO, tessellated approximations)

**Depends on**: EXP-027, EXP-028

**Answer**: EXP-028 FALSIFIED exact correspondence. SLDPRT↔STEP exact matches: 3/24 (C00), 6/212 (C04), 4/60 (C03). Mean distance ~0.01mm. SLDPRT vertices are DisplayList tessellation, not exact B-rep vertices.

**Will eliminate or constrain**: OQ-023 (vertex semantics). Parser output cannot be directly compared to STEP geometry.

**Evidence to archive**: `v0.4.7/EXP028_VERTEX_CORRESPONDENCE.json`, `knowledge/evidence/2026-08-14_v0.4.7-EXP028.md`.

**Last updated**: 2026-08-14

---

## NQ-016: What Is the Chord-Error Tolerance for DisplayList Tessellation?

**Status**: Ready

**Depends on**: EXP-028

**If answered**: Determines the maximum distance from SLDPRT vertices to true B-rep surfaces.

**Will eliminate or constrain**: OQ-024 (tessellation parameters), provides validation tolerance for parser output.

**Evidence to archive**: Distance from SLDPRT vertices to STEP surfaces, chord error calculation, tolerance bounds.

**Last updated**: 2026-08-14

---

## NQ-017: Does a Third Diameter Data Point Confirm VC-Diameter Relationship?

**Status**: Ready

**Depends on**: EXP-028, new controlled model (C11 with 4mm hole)

**If answered**: Fits power law vc = a * diameter^b, distinguishes linear from non-linear relationships.

**Will eliminate or constrain**: OQ-021 (hole geometry encoding), provides exact vc prediction formula.

**Evidence to archive**: vc for 4mm hole, power law fit, R² value, residual analysis.

**Last updated**: 2026-08-14

---

## NQ-018: Do Block1 Tokens Change with Scale or Translation?

**Status**: Ready

**Depends on**: EXP-029, C01 (20mm cube), C02 (translated cube)

**If answered**: Determines if tokens encode face orientation or tessellation parameters.

**Will eliminate or constrain**: OQ-001 (Block 1 grammar), H5 (tessellation parameters), H6 (face orientation).

**Evidence to archive**: Token comparison between C00 (10mm) and C01 (20mm), C00 and C02 (translated).

**Last updated**: 2026-08-14

---

## NQ-019: What Do the Alternating Tokens (150, 153) in Cylindrical Faces Represent?

> **Correction, 2026-09-14 (EXP-042–046):** Answered by geometric edge mapping and downstream metadata. Values 150/153 label the two cylinder boundary curves in the corresponding controlled models. Evidence: [v0.4.8 report](../v0.4.8/README.md).

**Status**: Ready

**Depends on**: EXP-029

**If answered**: Determines if tokens encode tessellation angles or other parameters.

**Will eliminate or constrain**: H5 (tessellation parameters), OQ-003A (VALUE semantics).

**Evidence to archive**: Token analysis across multiple cylindrical faces, correlation with geometry.

**Last updated**: 2026-08-14

---

## NQ-020: Do Different Face Types Have Different Token Signatures?

**Status**: Ready

**Depends on**: EXP-030

**If answered**: Determines if token patterns can be used to classify face types (cube, cylindrical, fillet, etc.).

**Will eliminate or constrain**: OQ-001 (Block 1 grammar), H5 (tessellation parameters), OQ-003A (VALUE semantics).

**Evidence to archive**: Token comparison across face types (cube, cylindrical, fillet, chamfer), correlation with surface geometry.

**Last updated**: 2026-08-14

---

## NQ-021: Do Token Signatures Correlate with Face Orientation?

**Status**: Ready

**Depends on**: EXP-031

**If answered**: Determines if token signatures can be used to predict face orientation.

**Will eliminate or constrain**: OQ-001 (Block 1 grammar), H5 (tessellation parameters), OQ-026 (face orientation).

**Evidence to archive**: Token comparison across faces with different orientations, correlation with face coordinates.

**Last updated**: 2026-08-14

---

## NQ-022: Do Token Signatures Correlate with Model Type (Fillet/Chamfer/Hole)?

**Status**: Ready

**Depends on**: EXP-032

**If answered**: Determines if token signatures can be used to predict model type or feature type.

**Will eliminate or constrain**: OQ-001 (Block 1 grammar), H5 (tessellation parameters), OQ-028 (face orientation).

**Evidence to archive**: Token comparison across models with different features (fillet, chamfer, hole), correlation with model type.

**Last updated**: 2026-08-14

---

## NQ-023: What Global Model State Property Causes Signature Changes?

**Status**: Ready

**Depends on**: EXP-033

**If answered**: Determines what property is common to fillet/chamfer models but absent in hole models that causes token signature changes.

**Will eliminate or constrain**: OQ-032 (global model state mechanism), provides predictive model for signature changes.

**Evidence to archive**: Comparison of global model state properties across C00, C03, C09, C04; identification of distinguishing property; prediction test on new models.

**Last updated**: 2026-08-14

---

## NQ-024: Why Do -X/-Y Signatures Remain Unchanged While +X/+Y Change?

**Status**: Ready

**Depends on**: EXP-033

**If answered**: Determines the mechanism by which global model state affects some orientations but not others.

**Will eliminate or constrain**: OQ-032 (global model state mechanism), OQ-030 (C03/C09 signature differences).

**Evidence to archive**: Analysis of -X/-Y vs +X/+Y face properties, adjacency patterns, serialization order.

**Last updated**: 2026-08-14

---

## NQ-025: What Distinguishes Feature-Induced Changes from Geometric Transformations?

**Status**: Ready

**Depends on**: EXP-033, EXP-034

**If answered**: Determines why fillet/chamfer features cause token signature changes on unrelated faces, while scale/translation do not. Identifies the specific property that distinguishes feature-induced changes from geometric transformations.

**Will eliminate or constrain**: OQ-032 (global model state mechanism), OQ-033 (fillet/chamfer common property), provides predictive model for token signature changes.

**Evidence to archive**: Comparison of C00/C03/C09 (feature models) vs C00/C01/C02 (transformation models); identification of distinguishing property; analysis of topological changes vs geometric changes.

**Last updated**: 2026-08-14

---

## NQ-026: Why Do Fillet/Chamfer Produce Global Token Changes While Shell and Holes Do Not?

**Status**: Ready

**Depends on**: EXP-033, EXP-034, EXP-035

**If answered**: Determines the specific property that distinguishes fillet/chamfer from shell and holes. Identifies why fillet/chamfer cause token changes on unrelated faces while shell and holes do not.

**Will eliminate or constrain**: OQ-032 (global model state mechanism), OQ-033 (fillet/chamfer common property), OQ-035 (why feature operations cause token changes).

**Evidence to archive**: Comparison of C00/C03/C09 (fillet/chamfer) vs C00/C04/C05/C10/C11 (hole/shell); analysis of what fillet/chamfer have in common that shell/holes do not; analysis of external boundary modification hypothesis.

**Last updated**: 2026-08-14

---

## NQ-027: Why Does Adding a New Face at an Edge Cause Global Token Changes?

**Status**: Ready

**Depends on**: EXP-036

**If answered**: Determines the mechanism by which adding a new face at an edge location causes token changes on unrelated faces. Identifies what property of the added face causes the token changes.

**Will eliminate or constrain**: OQ-036 (why fillet/chamfer produce global token changes), OQ-032 (global model state mechanism), OQ-033 (fillet/chamfer common property).

**Evidence to archive**: Comparison of C03/C09 (which add a new face) vs C04/C05/C10/C11 (which do not); analysis of the added face's properties; analysis of token change patterns.

**Last updated**: 2026-08-14

**AUDIT NOTE (2026-08-14, Archivist Audit) — confound analysis before running any follow-up experiment:**

This question's premise ("adding a new face at an edge correlates with global token-signature changes") is plausible but not yet cleanly isolated from several confounds present in the current corpus. Full detail in `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`.

1. **"Adds a face" is not the discriminator.** EXP-036's own "added" metric (0 for holes/shell) is a measurement artifact of an orientation-bucket-collision bug in `exp036_feature_class_differential.js` — holes and shell also add faces (C04: +1 cylindrical face; C10: +5 inner walls, per EXP-035), the script just fails to detect them. So all four feature types tested (fillet, chamfer, hole, shell) add at least one face; "adding a face" per se cannot be what separates the two groups.
2. **"At an edge" has not been directly measured.** No script in EXP-027–036 computes real topological adjacency (shared edges/vertices) between the new face and existing faces. EXP-033's `isAdjacentToModified()` uses a same-orientation-label heuristic that cannot detect true adjacency on this corpus (Finding A in the audit file) — its "FALSIFIED" adjacency conclusion should be treated as untested, not as ruling adjacency out. "Adding a face at an edge" is currently a plausible domain-informed inference (fillet/chamfer are CAD edge features by definition) rather than a measured discriminator.
3. **Single edge location tested.** C03 (fillet) and C09 (chamfer) both consistently change face index 2/3 (+X/+Y) — see EXP-033 §4.3. No evidence in the archive shows the fillet and chamfer were applied to *different* edges of the cube. If both were applied to the same edge, the corpus has tested one edge-feature location with two feature types, not multiple independent locations, and cannot distinguish "faces adjacent to *the* modified edge change" from "faces at index 2/3 change whenever any edge-type feature is applied, regardless of which edge."
4. **Confounded variables not yet separated**, per the task's own list: feature type (edge feature vs. cut/hole feature) is perfectly confounded with "adds a face touching a pre-existing edge" in this corpus, because SolidWorks has no edge-modifying feature that doesn't also add a face, and no non-edge feature in the corpus that adds a face touching a pre-existing edge. Face ordering/serialization order is not ruled out either (face index happens to be identical across all compared models, so index-based and adjacency-based explanations remain indistinguishable with the current data).

**Recommendation**: NQ-027 is a reasonable next research direction in principle, but should not be pursued via a repeat of EXP-036's methodology. See NQ-028 for the smallest experiment that would discriminate "location-specific/adjacency-based" from "feature-type/global-state-based" explanations. Do not promote H8 ("adding a new face at an edge") beyond Hypothesis status until that test (or an equivalent one) is run.

**UPDATE (2026-08-15, EXP-037/EXP-038)**: Confounds (2) and (3) above are resolved. (2) "At an edge" is now directly measured via real vertex/edge-sharing adjacency (`computeAdjacency()`, EXP-037/038) rather than inferred — confirmed true for both tested edges. (3) A second edge location was tested (EXP-038, using a real C12 model supplied by the user): the changed-face set relocated to track the new edge, ruling out the "always faces 2/3 regardless of edge" alternative. Confound (1) ("adds a face" is not the discriminator — all four feature types add a face) remains valid and untouched by EXP-037/038. Confound (4) (WHY adjacency/direct-modification triggers a token change, and whether "real adjacency" vs. "this face's own vertices were directly modified" can be separated) remains open — see `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md` Section 7. NQ-027's core "why" question is therefore still open, but with two of its four original confounds removed and Hypothesis H8 upgraded from Hypothesis to Strong Evidence (not Verified) for the location/adjacency-based framing specifically.

---

## NQ-028: Does Fillet/Chamfer Applied to a Different Edge Move the Affected Faces? (Smallest Discriminating Test for NQ-027)

**Status**: **Answered 2026-08-15 (EXP-038)**, for the two edge locations tested. A real C12 model (1mm fillet, edge shared by -X/-Y, verified from its own STEP file) was supplied by the user and compared against C00/C03 using EXP-037's tooling (with a validated bounding-box-center correspondence refinement). Result: the Block1 token-changed face set relocated from {+X,+Y} (C03) to {-X,-Y} (C12) — exactly the two faces bordering the new fillet edge, matching each model's own real (vertex-computed) adjacency set, and structurally unmodified in both cases. Face index also changed ({2,3}→{0,1}). **Verdict: Strong Evidence for the location/adjacency-based explanation (a) below, and Hypothesis B / (b) as literally stated is falsified** — not Verified/invariant (n=2 edges; mechanism and the adjacency-vs-direct-modification confound remain open). See `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`. No further experiment was begun after EXP-038, per instruction.

Status history: Blocked — attempted 2026-08-14 (EXP-037), core question NOT answered at that time. The controlled-corpus SLDPRT files were absent from this repository/environment entirely, and the archived JSON corpus contained exactly one fillet model (C03) and one chamfer model (C09), both confirmed (independently, by face-index tables in EXP-033 §4.3 and by EXP-037's own vertex-based adjacency computation) to modify the same physical edge. A new model was required; see `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md` §6 for the exact specification (base = C00, 1mm fillet or chamfer on the edge shared by -X/-Y, suggested name `C12_cube_fillet_1mm_edge2`) — this is exactly the model the user supplied for EXP-038. EXP-037 built and validated the analysis tooling this question needed (`v0.4.7/exp037_edge_location_and_adjacency.js`: real vertex/edge-sharing adjacency, centroid-distance face correspondence); EXP-038 reused it with one measured refinement (bounding-box center) required once tested against the real C12 file.

**Depends on**: EXP-033, EXP-036, EXP-037, EXP-038, and the confound analysis in NQ-027 above.

**Answer** (EXP-038, 2026-08-15): (a) **location/adjacency-based** is supported by the evidence: for both tested edges, the specific faces that change are exactly the ones topologically adjacent (real, vertex-computed adjacency, not orientation label) to the edge actually modified, and this relocates correctly when the edge moves. (b) **feature-type/global-state-based, as literally stated** ("the same faces, index 2/3 or +X/+Y, change... independent of which edge") is falsified: C12 changes indices {0,1} / orientations {-X,-Y}, not {2,3} / {+X,+Y}. This is Strong Evidence, not a Verified invariant — n=2 edges, both vertical, both on the same cube; the mechanism is unknown; and "real topological adjacency" vs. "this face's own vertices were directly, if minutely, modified by the trim" remain confounded for edge-type features in this corpus (both point to the identical face set by construction). See `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md` Section 7 for the full anti-overclaim discussion.

**Historical text below retained for continuity (proposed method, written before EXP-038 executed it):**

**If answered**: Directly discriminates two competing explanations for the EXP-033/036 "global token change" effect: (a) **location/adjacency-based** — the specific faces that change are always the ones topologically adjacent to whichever edge was actually modified; vs. (b) **feature-type/global-state-based** — the same faces (index 2/3, +X/+Y) change whenever *any* edge-type feature (fillet/chamfer) is applied anywhere on the model, independent of which edge. The current corpus cannot distinguish these because only one edge (the one between +X and +Y) has ever been filleted/chamfered.

**Proposed method** (generation not executed by EXP-037 — analysis tooling built and validated there, 2026-08-14; model supplied by the user and executed as EXP-038, 2026-08-15): Generate one additional controlled model — the same C00 base cube with a 1mm fillet (or chamfer) applied to a *different* edge, e.g. the edge shared by -X and -Y (or by +X and -Y), rather than the +X/+Y edge used by C03/C09. Parse it with the validated pipeline (or, for consistency with EXP-037, extract full per-face vertex arrays the way `vertex_analysis.js` does), and run `v0.4.7/exp037_edge_location_and_adjacency.js`'s `analyzePair`/`computeAdjacency`/`matchFaces` against a new `C00_cube_10mm_vs_C12_...` pair to check which faces' Block1 token signatures change relative to C00, and whether the real (vertex-computed) adjacency set moves with the new edge.
- If the changed faces are now -X/-Y (i.e., track the new edge location) → supports the location/adjacency-based explanation. **This is what happened** — see Answer above.
- If the changed faces are still +X/+Y (i.e., independent of which edge was modified) → falsifies the adjacency-based explanation and supports a feature-type or global-serialization-counter explanation instead (e.g., "the first edge-type feature in the tree always perturbs faces 2/3" or a monotonically-incrementing internal ID unrelated to geometric location).

Either outcome is a clean falsification of one branch, making this the highest information-gain single experiment available for NQ-027. It requires generating exactly one new SLDPRT file (not currently in the archived corpus) — no new tooling.

**Will eliminate or constrain**: NQ-027, OQ-032, OQ-033, OQ-036. (See those entries for updates reflecting EXP-038's answer.)

**Evidence to archive**: New model's Block1 token signatures by orientation, side-by-side with C00/C03/C09; explicit statement of which edge was modified; face index/orientation table matching EXP-033 §4.3's format. **Archived**: `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`, `v0.4.7/EXP038_RESULTS.json`, `v0.4.7/EXP038_SUMMARY.md`.

**Last updated**: 2026-08-15 (answered by EXP-038; originally added 2026-08-14 by Archivist Audit)

---

## NQ-029: Is Adjacency-Without-Modification Ever Sufficient, and Can a Model Fully Isolate It From Direct Modification?

> **Correction, 2026-09-14 (EXP-042–046):** C13 is no longer a prerequisite for parsing B1/B2. Its causal/persistent-ID question is distinct from the now-established format mapping; keep it as optional future input. Evidence: [v0.4.8 report](../v0.4.8/README.md).

**Status**: Partially Answered (EXP-039); fully isolating the co-occurring case is Blocked (requires a new SolidWorks model, design-stage only)

**Depends on**: EXP-037, EXP-038, EXP-039

**Answer (partial, EXP-039, 2026-08-16)**: Using shell (C10) and hole (C04) as controls where real adjacency and direct vertex modification come apart (unlike fillet/chamfer/C12, where they always co-occur), adjacency to changed/added geometry WITHOUT the face's own vertices moving never causes a token change: 0/12 across fillet, chamfer, hole, and shell, extending EXP-037's single qualitative shell observation to a quantified, multi-feature-type result. This makes direct modification the parsimonious explanation for every case tested (11/11 modified faces changed token, 0 counterexamples).

**What remains unanswered**: the complementary cell — direct modification WITHOUT any adjacency to new/changed geometry — has zero examples in this corpus, and EXP-039 argues (topologically) that no feature which creates a new face by editing an existing face's boundary loop can produce one: gaining a shared boundary with a new face is itself a boundary change for the neighbor, so "adjacent to new face" and "directly modified" are coextensive for that class of feature by construction. Testing modification-in-total-isolation from adjacency would need a fundamentally different mechanism.

**Proposed model** (`C14`, design-stage only, NOT built, NOT verified against real SolidWorks behavior): same `C00_cube_10mm` base, with a Split Line (or equivalent projected-curve/sketch-split feature) bisecting the +Z face into two coplanar rectangular halves (e.g. a line at `x=0.005`, spanning `y=0` to `y=0.01`, projected onto +Z). Predicted (unverified) effect: adds one new internal edge and two new vertices to +Z, splitting it into two new faces, without moving any of +Z's four original corner vertices and without touching any of the four side walls' own vertices at all. If the four side walls remain token-unchanged despite each now bordering one of the two new half-faces instead of the single original +Z face, that extends EXP-039's finding to a case with zero vertex perturbation anywhere near the new boundary. If their tokens DO change, that is the first case where pure new-face adjacency (with provably zero modification) causes a change, overturning EXP-039's interpretation. See `knowledge/RESEARCH_HANDOFF.md` "Possible Future Directions" for the same spec.

**Will eliminate or constrain**: OQ-032, OQ-033, OQ-036, Current Unknown #5 in `RESEARCH_HANDOFF.md`.

**Evidence to archive**: C14's Block1 tokens for the four side walls, before/after comparison against C00, real vertex-coordinate identity check for the side walls (expect: 100% identical), real adjacency check between each side wall and the two new split-half faces (expect: newly adjacent, 0 shared vertices with old +Z beyond the unchanged corners).

**Last updated**: 2026-08-16

**CORRECTION NOTE (2026-08-17, audit of EXP-037→EXP-040)**: The "0/12 ... 11/11" answer above needs two corrections. (1) "11/11" is wrong — `EXP039_DIRECT_MODIFICATION_NECESSITY.json` never computed it (its `rows` array excludes every directly-modified face by construction); recomputed directly from `EXP037_RESULTS.json`/`EXP038_RESULTS.json`, the real figure is **14/14 known cases (1 unknown)**. (2) More importantly for this question specifically: re-checking which faces make up the 12 "adjacent" cases against `EXP037_RESULTS.json`'s own `added[].adjacentToModelFaces` data shows every one of them is adjacent only to an already-*directly-modified* neighbor (hole's -X/-Y/+X/+Y are adjacent to the hole's own modified +Z/-Z, not to the new cylindrical face; shell's four "adjacent" faces are adjacent to the shell's own modified opening, not to any of the five new inner walls; fillet/chamfer's -X/-Y are adjacent to +Y/+Z/-Z, not to the new face). **None of the 12 cases actually test "adjacent to newly-created geometry without modification" — they test "adjacent to a directly-modified neighbor without modification," which is a different, weaker claim.** This means NQ-029's title question ("Is Adjacency-Without-Modification Ever Sufficient?") is not actually answered even partially by the existing corpus — the confound this question was meant to test around is universal across all four feature types tested here, not specific to edge-type features as EXP-038 originally scoped it. The `C14` proposal below is unaffected by this correction and remains the way to actually test the question — if anything, this correction strengthens the case for it, since no existing model in this corpus can substitute. Full derivation: `v0.4.7/EXP039_SUMMARY.md`'s matching correction note. No new experiment was run to produce this note.

**UPDATE (2026-09-13, EXP-041)**: The controlled-corpus SLDPRT files for C00–C11 were committed (`d0c6c54`), so this question can now be attacked with real binaries instead of archived JSON for the first time. It was, and **the answer is unchanged: still unanswered, and now demonstrably unanswerable within this corpus.** EXP-041 recomputed the full cross-tabulation from source across all 13 models, 12 pairs and 65 matched face correspondences — including C06, C07, C08 and C11, which no prior experiment had analyzed for tokens or adjacency at all. The discriminating cell {vertices unchanged} × {adjacent to a newly created face} contains **0 rows**. The 2026-08-17 correction above established this over five feature models; it now holds over the complete corpus. **The five newly supplied models do not break the confound and cannot** — no feature in this corpus's vocabulary creates a new face without perturbing its neighbour's own vertices. The `C13` split-line model specified in `v0.4.7/RESEARCH_DESIGN_next_experiment.md` §6 (called `C14` in the proposal below) remains **required and unbuilt**; it is now the single highest-value missing input in the project, and the case for it is strictly stronger than before, since the corpus expansion that might have substituted for it has been tried and did not. See `knowledge/evidence/2026-09-13_v0.4.7-EXP041.md` §5 and `v0.4.7/EXP041_SUMMARY.md` §5.

---

## NQ-030: Controlled models covering surface tags beyond plane and cylinder

**Status**: Open. Requires new models from the user; no analysis can substitute.

**Why**: The controlled corpus C00–C12 exercises only **tag-4001 (plane)** and **tag-4002 (cylinder)** — cubes, through-holes, fillets, chamfers and a shell produce nothing else (per-model tags verified from `EXP045_RESULTS.json`, 2026-09-15). Every other surface tag is validated only against complex production models with no analytic ground truth and no controlled single-variable structure:

| tag | occurrences | models containing it |
|---|---|---|
| 4003 | 47 | distributor (17), Pocket Wheel (20), USB hub BOTTOM (8), Helical Bevel Gear (2) |
| 4005 | 35 | Pocket Wheel (26), USB hub TOP (7), distributor (1), Helical Bevel Gear (1) |
| 4006 | 42 | Helical Bevel Gear (32), Dekor (8), USB hub TOP (2) |
| 4007 | 33 | Pocket Wheel (32), USB hub TOP (1) |
| 4009 | 311 | Dekor (311) |

Consequences already visible: EXP-047/048 had to validate cone metadata against production models; EXP-050 resolved their open thread but only for tag-4003; and tags 4005/4006/4007/4009 have **no external validation at all** — only `4001` and `4002` have been checked against independently exported STEP geometry (EXP-045, 94/94 controlled faces).

**What would close it** — controlled models in the C-series style (one primitive each, built in SolidWorks 2022, exported as `model.SLDPRT` + `model.step` + `model.STL`, volume-verified at build time):

- **C13_cone** — a simple revolved or lofted cone of known half-angle and base radius (exercises tag-4003 with analytic ground truth, which no current controlled model provides).
- **C14_torus** — a revolved circular profile (a likely candidate for one of 4005/4006).
- **C15_sphere** — a revolved semicircle.
- **C16_spline_surface** — a lofted or swept surface over a known spline (a likely candidate for 4009, which currently occurs *only* in Dekor).
- **C17_cube_splitline** — the Split Line model specified in `v0.4.7/RESEARCH_DESIGN_next_experiment.md` §6, still unbuilt and still the only construction that populates the empty adjacency/modification cell (see NQ-029).

Each should be a single feature on a known base so the surface parameters are analytically predictable, matching how C00–C12 were built.

**Blocking**: no SolidWorks access exists from this environment; these must be supplied the same way C12 and C00–C11 were.

**Date raised**: 2026-09-15 (EXP-050).

---

## NQ-031: Can curved faces be exported as analytic STEP surfaces rather than facets?

**Raised by**: EXP-053 (`converter/v0.1`).

`converter/v0.1` emits analytic `PLANE` surfaces for tag-4001 faces and facets everything else.
The blocker is *not* the surface definitions — cylinders and cones carry axis point, direction
and radius, validated against independently exported STEP in EXP-045 (94/94 controlled faces)
and EXP-048 (8/8 USB hub cone records). C04's cylinder, for instance, gives axis base
`(0.005, 0.005, 0)`, direction `(0,0,1)`, radius `0.0025` — a complete `CYLINDRICAL_SURFACE`.

The blocker is the **trim curves**. A cylindrical face's boundary is a circle, but the stored
boundary cycle is a polygon (34 segments on C04's hole). Emitting `CYLINDRICAL_SURFACE` trimmed
by a 34-gon would be worse than faceting: it claims an exact surface while bounding it with an
inexact curve.

**Measured immediately, 2026-09-20, and the answer is "not yet".** Radial residual of tag-4002
boundary-cycle vertices against the stored radius:

| corpus | 4002 faces | vertices | worst residual | worse than 1e-5 mm |
|---|---|---|---|---|
| controlled C00–C12 | 10 | 538 | **6.05e-7 mm** | 0 |
| full corpus (24 files) | 276 | 9,669 | **1.20e-1 mm** | **1,518** |

On the controlled corpus the boundary vertices *are* on the cylinder — worst residual 6e-7 mm,
at float32 noise for these dimensions (~1.2e-7 mm at a 2.5 mm radius), mean below 4e-7 mm on
every face. Taken alone that would say circles are directly fittable and analytic export is
straightforward.

It does not generalise. Across the full corpus 1,518 of 9,669 boundary vertices lie more than
1e-5 mm off the stored radius, the worst by 0.12 mm in Pocket Wheel — five orders of magnitude
beyond float32 noise. Those vertices are not on the cylinder at all. This is the EXP-050
situation generalised: some boundary-cycle vertices are interpolated or chord points rather than
surface samples, and the controlled corpus's simple full-circle through-holes happen to avoid
the case entirely.

**So the caution was right and the controlled corpus is not sufficient to settle this.** Building
`CYLINDRICAL_SURFACE` export on the controlled-corpus result would produce exact output for
cubes with holes and silently wrong trim curves on real parts.

**What would settle it**: characterise *which* boundary vertices deviate. Candidate
explanations to separate — (a) the cycle includes vertices belonging to an adjoining face rather
than the cylinder, (b) the face is a partial or trimmed cylinder whose boundary is not a circle,
(c) the stored radius applies to a different portion of a compound face. The per-vertex data
needed is already in `parser/v0.2` output; no new models are required. Worth also checking
whether the deviating vertices correlate with the `edgeIds` on the cycle, since a cycle mixing
two edge IDs is a hint for (a).

**Not blocked on new models** — the existing corpus has 276 tag-4002 faces with parameters.

**Date raised**: 2026-09-20 (EXP-053). **Measured same day**; left open.

---

## NQ-034 — Does the DisplayLists record layout vary across `_DL_VERSION_*`?

The modern container declares a DisplayLists format version in a stream we have never read.
Across the 21-file modern corpus: `_DL_VERSION_13000` (2 files), `14000` (1), `15000` (15),
`16000` (1), `17000` (2).

Our parser treats the format as monolithic and has been validated across all five versions
without ever consulting the declaration. That our invariants hold across five declared versions
strengthens them. But being right by accident is not the same as being right on purpose: if a
future version changes the record layout, we will misparse it silently rather than reject it.

**What would settle it**: read the tag, group corpus results by it, and check whether any
per-face invariant (array order, `Block2[i] = 2L[i] − 2`, Block3 count) correlates with version.
If nothing correlates, the tag is advisory and the parser should still surface it and warn on
unseen values.

**Not blocked** — the data is already in the corpus.

**Date raised**: 2026-09-20.

## NQ-035 — Can a face record legitimately carry zero normals?

XRTC5/sldprt-export's code explicitly permits a face record with zero normals entries. Our
parser requires `normals.count === positions.count` and would reject such a record outright.

Tested against our corpus: 21 files, 1,272 faces accepted, **0 records rejected**. The case does
not occur here.

**This does not refute their claim.** Our corpus is 21 curated files and absence in it is weak
evidence about the wild. The asymmetry matters: if the case is real, we reject a valid face and
lose geometry silently from the user's point of view.

**What would settle it**: a part that exhibits it. Failing that, decide the policy deliberately —
either keep rejecting and say so in the error, or accept and synthesise normals from strip
winding, flagged in output.

**Blocked on** a model exhibiting the case, or on reading sldprt-export's source closely enough
to learn what produces it.

**Date raised**: 2026-09-20.

## NQ-036 — Does the "extended" tessellation-table header (cadmpeg AL-03) occur here?

cadmpeg's open-items document describes an extended per-face tessellation-table header form
carrying a nonzero token in a slot we have only ever observed at a fixed value. Our parser
throws `Unsupported strip control` on anything but `1`.

**What would settle it**: scan the corpus for face records whose control token is not 1, and for
signature matches our `findAll` currently walks past. If none occur, record the negative result
with the corpus size so the claim is bounded rather than ignored.

**Not blocked**.

**Date raised**: 2026-09-20.

## NQ-037 — Enumerate node types in the inflated `Config-0-Partition`

[CONTAINER_AND_STREAMS.md](CONTAINER_AND_STREAMS.md) §5 establishes that the partition inflates
to a Parasolid XT transmit file in 21/21
modern files, schema base `13006` in every case. Nothing has been decoded.

The right first milestone is deliberately small and does not require a schema table: confirm the
header, length-delimit the node stream, and enumerate node types and counts **without resolving
fields**. That alone tells us whether the body is the full B-rep or a reduced partition, and
gives a falsifiable target before any field-level work begins.

**The schema problem is not solved by this.** Per [PRIOR_ART.md](PRIOR_ART.md) §3, machine-usable Parasolid schema
data in the public ecosystem is either sourced from a Siemens SDK, of undocumented provenance,
or derived from a decompiled kernel. None of those is a clean dependency for this project. The
plane/cylinder/cone entities we care about are simple fixed structs, so deriving a minimal
schema for them independently is plausible — but that is the hard part, and it should not be
started by copying someone else's asset.

**Not blocked** for the enumeration milestone.

**Date raised**: 2026-09-20.


---

## NQ-030 status update, 2026-09-21 (EXP-055) — PARTIALLY RESOLVED

Four of the unknown tags are identified against SolidWorks-reported ground truth and recorded
as INV-025: **4003 cone** (previously asserted but never confirmed), **4004 sphere**,
**4005 torus**, **4006 B-surface/parametric**.

**Still open: 4007 and 4009.** Neither occurs anywhere in either corpus, so no amount of
analysis on the current files will settle them — this needs new models. Surface types not yet
exercised: surface of revolution with a non-circular profile, sweep along a spline, offset
surface, ruled surface, and blends other than a simple fillet torus. A model per candidate,
built the same way as C13–C16, would close it.

Also settled in passing: the tag encodes the **surface type, not the trimmed patch**. A 90°
torus (`C17_torus_quarter`) carries the same 4005 as a full one.

## NQ-038 — Legacy OLE2 support, now testable

All 25 SolidWorks 2011 models in `test files new/SW2011` are rejected with `Legacy OLE2 is not
supported`. That is expected behaviour, not a regression.

What changed is that the target is no longer blind. We now hold a controlled legacy corpus with
known geometry, known volumes and known per-face surface types, including curved primitives
(`C25_cone_sw2011_native`) and a cylindrical hole (`C26_cube_hole_sw2011_native`). Any legacy
decode can be checked against known answers instead of inferred ones.

Open sub-questions: does legacy DisplayLists use the same per-face record grammar? Does it carry
the same surface tag values (INV-025), or a different numbering? Is Block1's edge-ID annotation
present? `C22`/`C25`/`C26` are matched by geometry to `C00`/`C13`/`C04`, so each question can be
asked as a direct comparison.

**Not blocked** — the corpus exists.

**Date raised**: 2026-09-21 (EXP-055).

## NQ-039 — Metadata gate discards valid tags on upgraded files

`parser/v0.2` gates the entire forward metadata record on INV-023's edge-ID correspondence.
In `C23_cube_sw2011_to_2022` — a 2011 part opened in 2022 and resaved — the metadata edge table
is empty (`count = 0`) while Block1 still carries its edge IDs. The check fails and the parser
discards the whole record, including a surface tag that is present and correct (4001).

The fix is to separate the two cases: an **empty** edge table should be recorded as such with a
warning, leaving `typeTag` readable; a **non-empty** table that disagrees with Block1 should keep
failing loudly, since that is the corruption INV-023 actually guards against.

Not yet applied, because it changes what a populated `metadata` field means and the invariant
validation runs should be re-run against the change rather than after it.

**Date raised**: 2026-09-21 (EXP-055).


---

## NQ-034 — RESOLVED 2026-09-21 (EXP-057)

One per-face record grammar parses all five declared format versions with zero rejections:
13000 (2 files, 107 faces), 14000 (1, 375), 15000 (39, 355), 16000 (1, 400), 17000 (2, 177) —
1,414 faces total. The declared version does not select a record layout across this range.

The parser should still surface the tag and warn on a value outside 13000–17000: the evidence
bounds the range tested, it does not establish that no version ever differs.

## NQ-036 — RESOLVED as a bounded negative, 2026-09-21 (EXP-057)

Every one of 11,515 strips across 45 files carries strip control token `1`. No extended
tessellation-table header form occurs anywhere in the corpus, which spans five declared format
versions, a curated corpus and a purpose-built one.

This bounds rather than refutes the possibility. Our parser's `Unsupported strip control` error
is reachable only by a file unlike anything we hold — which is the right behaviour, so no change
is warranted.

## NQ-035 — still open, now bounded (EXP-057)

Zero of 1,414 faces carry zero normals, and zero have a normals/positions count mismatch. The
case does not occur in 45 files. Still open because absence in our corpus is weak evidence about
the wild, but the parser's strict check costs nothing on anything we have seen.

## NQ-040 — Verify container CRC-32 in the parser

EXP-057 established that the `u32` at stream-header + 14 is a CRC-32 of the inflated stream
bytes: 1,730 named streams verified, 0 mismatches, 0 undecompressible.

`parser/v0.1`'s container reader currently uses that field only as a heuristic filter
(`>= 65536`) and never checks it. Container extraction has been flagged as unvalidated since it
was inherited unchanged; this is the check that would validate it.

Proposed: verify the CRC after inflating and report a stream that fails as corrupt or misframed
rather than parsing it. Deliberately not applied yet — it changes which inputs the parser
accepts, and the invariant runs should be re-run against the change rather than after it.

Note on the scan: a 6-byte signature swept across a whole file produces false positives. In this
corpus 1,465 spurious hits failed to decompress and 10 mismatched, all with non-printable names,
none with a printable one. Any implementation must separate those or it will report phantom CRC
failures.

**Date raised**: 2026-09-21 (EXP-057).


---

## NQ-041 — `textPrefix()` is schema-locked

`v0.4.9/exp058_schema_boundary.js`'s text reader asserts a hardcoded preamble
`/^230 0 \d+ \d+ /`. SolidWorks 2011 writes `186 0 12 27`.

```
SW2011 exports:  binary() parsed 25, failed 0
                 textPrefix() parsed 0, failed 25   ("unknown text preamble")
```

This matters more than a parsing inconvenience: the text reader is the *cross-validation half*
of the method. Without it the binary read has nothing independent to check against, so the
reader generalizes to other schemas precisely where its verification does not.

Fix: read the preamble by its declared structure rather than matching a literal, the same
mistake-and-correction as the greedy name regex in EXP-056.

**Date raised**: 2026-09-21 (EXP-059 §5).

## NQ-042 — The declaration trailing bytes cannot be decoded from any corpus we hold

Every schema entry has `00 01` after `code`; every corresponding text value is `0`. Two readings
fit equally well — `u16be` (disagreeing with the text) or `u8` flag + a separate always-1 byte
(agreeing) — and nothing in 312 export entries, 192 partition entries or the SW2011 set can
separate them, because every candidate is constant.

`parasolid/v0.1/src/xt-reader.js` now exposes the raw bytes and refuses to name the field.

**What would settle it**: any file whose text flag is nonzero, or whose trailing bytes are not
`00 01`. None exists in our corpora. This is genuinely blocked on new material, not on analysis.

**Date raised**: 2026-09-21 (EXP-059 §3).

## NQ-043 — The value at `Z + 5` may be a node count

At the declaration boundary, `u16be` at `Z + 5` varies with model complexity while everything
before it is byte-identical:

| model | value | faces |
|---|---|---|
| `C14_sphere` | 68 | 1 |
| `C00_cube_10mm` | 232 | 6 |
| `C20_cylinders_crossed` | 297 | 8 |
| `C16_loft_spline` | 361 | 6 (four B-surfaces) |

If it is a node count it is the natural next milestone for NQ-037, and it is checkable: a cube's
total is predictable from 6 faces, 12 edges and 8 vertices plus their surfaces and curves.

**Not blocked.**

**Date raised**: 2026-09-21 (EXP-059 §7).


---

## NQ-043 — ANSWERED in part, 2026-09-21 (EXP-060)

The field is real: only two byte positions vary in the 40 bytes after `Z`, and the surrounding
constants include the transmit's size box (1000.0) and resolution (1e-8), so it is a genuine
record boundary. The field is `u32be` at `Z+3`.

**It is not a node or topology count.** `C04_cube_hole_5mm` and `C06_cube_hole_moved` have
identical topology and differ only in the hole's position; the field reads 316 and 293.

> **WITHDRAWN 2026-09-21 (EXP-064).** That comparison was the wrong one. `C05` (3 mm hole),
> `C06` (5 mm hole moved) and `C11` (4 mm hole) **all read 293** while differing from each other
> in both hole size and position; `C04` is a lone outlier at 316 with identical build-log volume
> to C06. In the **legacy** corpus the field is constant within *every* equal-topology group
> (cube 251, +1 hole 297, +2 holes 357, fillet 319) — invariant to dimension and position alike,
> which is how a topology-determined count must behave. Modern: constant in 3 of 4 groups.
> The field is topology-determined in 22/22 legacy and 21/22 modern models with one unexplained
> modern outlier, so **the node-count reading is live again**. See
> [EXP-064 §6](evidence/2026-09-21_v0.4.9-EXP064.md).

What it does have is an exact relationship to the text form of the same body:
`binary − text == SolidWorks face count` in **24 of 24** models, over face counts 1 to 11.

Still open: what it counts. A node count remains plausible — every integer 1..176 appears in
C00's text stream — but that is a pattern, not a decode.

## NQ-038 — materially narrowed, 2026-09-21 (EXP-060)

"Legacy OLE2 unsupported" is a statement about the **DisplayLists path only**. The Parasolid
partition in the 25 SolidWorks 2011 files parses with the existing readers, unchanged:

```
16-byte section magic at offset 4   25/25
inner zlib inflated                 25/25
PS transmit header parsed           25/25
declaration prefix parsed           25/25
schema SCH_2201236_20000_13006      25/25   (base 13006, same as modern)
```

The container changed completely between 2011 and 2022; the Parasolid layer did not. B-rep
geometry in legacy files is reachable today and does **not** require legacy tessellation work
first. That reorders the remaining v0.4.9 targets: decoding the node stream now serves both
corpora at once.

Legacy specifics confirmed: the geometry stream is `DisplayLists__ZLB` (25/25) and the declared
version is `_DL_VERSION_4700`.

## NQ-044 — What is the 132-byte per-face record between Block3 and the metadata?

`parser/v0.2` skips it as an opaque prefix. EXP-060 shows it is **not** a fourth
`[stride,8,2,N]` block: it is a per-face numeric record whose bulk decodes as `f64` in metres.
On `C00_cube_10mm` every value is 0, 0.005 or 0.010 — exactly the cube's extents and
half-extents.

Open: the exact field layout. A centre point plus extents is the obvious reading but the window
alignment is not pinned down, and the first five words are small integers that match no known
count (`0 0 1 0 0` where vertex/strip/Block1 counts are 4, 1 and 6).

Worth doing because a per-face bounding box would be directly checkable against parsed vertices
on the whole corpus, and would be the first geometry we read outside the position array.

**Not blocked.**

**Date raised**: 2026-09-21 (EXP-060 §3).


---

## NQ-044 — RESOLVED 2026-09-21 (EXP-061)

> **EXP-062 qualification, 2026-09-21:** The bounding layout is independently corroborated on 1,414 modern faces; exact analytic tightness/provenance remains open. The genuine unknown byte ranges are 0–11 and 92–131; the other alleged unknown words below overlap decoded doubles. NQ-045 remains open. Legacy partition wrapper/header compatibility does not establish identical decoded Parasolid content across versions. See [independent audit](evidence/2026-09-21_v0.4.9-EXP062.md).

The 132-byte per-face record is a bounding box plus bounding sphere in metres: centre at
`+12/+20/+28`, max at `+36/+44/+52`, min at `+60/+68/+76`, radius at `+84`. Self-consistent
142/142 on both the midpoint and the corner-radius relations. Recorded as INV-026.

The bounds are **analytic**, not tessellated — they contain the mesh bbox on 140/142 and equal it
on 0/142, the two exceptions being float32 vertex rounding at 1.3 nm.

**Still open in that record**: bytes `+0…+11`, `+32`, `+56`, `+80` and `+88…+131`. The leading
three words are small integers (`0 0 1` on the cube's face 0) matching no count we know — the
vertex, strip, Block1 and Block3 counts there are 4, 1, 6 and 6. Tail words include `4294967295`,
a plausible sentinel. Worth a pass now that the geometry half of the record is anchored.

## NQ-045 — Does the bounding record survive into the legacy container?

INV-026 is verified on the 24 SolidWorks 2022 models only. EXP-060 showed the Parasolid layer is
identical back to 2011 while the container is not; the DisplayLists side has not been checked at
all, because `parser/v0.2` rejects legacy files before reaching any face record.

The legacy corpus is geometry-matched (`C22`/`C25`/`C26` to `C00`/`C13`/`C04`), so if the legacy
per-face record can be located, the bounding box is an ideal first probe: its values are known in
advance from the model dimensions, and the two self-consistency relations hold or they do not.

**Date raised**: 2026-09-21 (EXP-061).

## NQ-045 — RESOLVED, 2026-09-21 (EXP-064)

**Yes, unchanged.** The legacy stream `DisplayLists__ZLB` inflates in 25/25 files and carries the
same 132-byte record at the same offsets. Located by arithmetic alone — no parser, no walker,
which legacy makes unavoidable since `parser/v0.2` rejects these files outright.

| check | result |
|---|---|
| files yielding at least one record | **25/25** |
| bounding records found | **145** |
| `min <= max` on all axes (not a selection criterion) | **145/145** |
| record count == native face count | every model cross-checked against the build log |
| legacy box == modern box, geometry-matched | **21/22**, to 1e-6 m |

Boxes are correct against dimensions known in advance: `C00` `[0,0.01]³`, `C01` `[0,0.02]³`,
`C02` translated 50 mm, `C14` sphere `±0.005`, `C15` torus `±0.007 / ±0.002`.

INV-026 is a **format property**, not a SolidWorks 2022 property — it survives a complete
container change. Analytic per-face geometry is readable out of 2011 files today with no legacy
DisplayLists parser, extending EXP-060's conclusion from the Parasolid layer to the tessellation
container.

The single cross-era disagreement is `C16_loft_spline`, independently confirming EXP-063: the
spline box is padded in both eras, ~7.0 µm in 2011 and 1.036515329e-5 m in 2022 — the latter
being EXP-063's figure reproduced without OpenCascade or STEP.

## NQ-046 — What is the configuration-level bounding record for?

EXP-064 found a second record class at the INV-026 layout: one per configuration, preceded by the
configuration name in UTF-16LE, carrying that configuration's overall box. Present in 45/45 modern
files (1 in 43 files, 2 in 2 files); the box equals the union of that file's face boxes in 45/47.

Open: whether it also exists in the legacy container (the legacy scan found 145 records equal to
the face count, with no surplus, suggesting it may not), and whether the two-record files are
genuinely multi-configuration.

**Date raised**: 2026-09-21 (EXP-064).

## NQ-047 — Why is `C04_cube_hole_5mm` an outlier in the SW2022 `Z+3` field?

`C05`, `C06` and `C11` all read 293; `C04` reads 316, though the build log records identical
volume and identical build settings to `C06`. In the legacy corpus all four read 297. This single
outlier is the only thing standing between the `Z+3` field and a clean topology-determined count
across both eras. Resolving it would settle NQ-043's direction.

**Date raised**: 2026-09-21 (EXP-064).
