# Research Handoff

Compact, operational, persistent handoff between short-lived Cowork/Claude Code sessions on the SLDPRT reverse-engineering project. This is a navigation document, not the evidence archive — verify important claims against `knowledge/evidence/` and the underlying scripts/JSON before relying on them. This file did not exist before 2026-08-14; it was created by an archivist/debunker audit session that reviewed EXP-027 through EXP-036, updated the same day by the session that ran EXP-037 (NQ-028 attempt, blocked), and updated again 2026-08-15 by the session that ran EXP-038 (NQ-028 answered). If you are a fresh session, read this file first, then `RESEARCH_DASHBOARD.md`, then the specific evidence files referenced below.

**Last updated**: 2026-08-15, by the EXP-038 session (executed NQ-028 using a real second-edge fillet model, C12, supplied by the user; answered the core discriminating question — see "Recent Experiments" below). No further experiment was begun after EXP-038, per instruction — there is currently no "Recommended Next Experiment" in progress; see "Possible Future Directions" below for context only. Before that: 2026-08-14, by the EXP-037 session (attempted NQ-028; corpus insufficient at the time, so built/validated corrected adjacency+correspondence tooling and documented the exact new-model requirement). Before that: 2026-08-14, by an archivist/debunker audit session (no new experiment executed; corrected/annotated existing knowledge base).

---

## Current Research Phase

Block1/Block2 token-semantics investigation using a controlled, single-feature-at-a-time corpus (v0.4.7, `test files original/controlled/C00`–`C11`: a 10mm cube with one geometric change each — scale, translation, hole diameter/position, fillet, chamfer, shell). This follows the completed and corrected alternative-header/serialization-container analysis (v0.4.3–v0.4.5, closed out by EXP-026/INV-019 in v0.4.6).

**Note:** the controlled corpus SLDPRT files for C00–C11 are still not present in this repository snapshot (`test files original/controlled/` did not exist before 2026-08-15) — only their JSON/MD outputs under `v0.4.7/` and `knowledge/evidence/` are archived. Any session that wants to re-run or extend v0.4.7 experiments on C00–C11 needs the original corpus files, which are referenced by relative path in every v0.4.7 script but not checked into this dump. This was reconfirmed 2026-08-14 by EXP-037 via a full-filesystem search (`find / -iname "*.sldprt"`) and was the reason NQ-028 could not be executed at that time.

**UPDATE (2026-08-15, EXP-038)**: `test files original/controlled/` now exists and contains ONE real model: `C12_cube_fillet_1mm_edge2/` (`model.SLDPRT`, `model.step`, `model.STL`), supplied by the user specifically to answer NQ-028 (a 1mm fillet on the edge shared by -X/-Y, per EXP-037 §6's specification). This is the only controlled-corpus model with real files in this environment — C00 through C11 are still archive-only. A future session that wants to re-verify C12 or extend this comparison (e.g. re-parsing it for a different purpose) can do so directly; a session that wants to test yet another edge/feature would still need a new model supplied the same way.

The parser (`parser/v0.1`) is a separate, already-validated artifact built on the pre-v0.4.7 state (through v0.4.6/INV-019). It has not incorporated any v0.4.7 finding, and none of the v0.4.7 findings are invariant-level, so there is currently nothing from v0.4.7 that the parser needs to adopt.

---

## Highest-Confidence Findings (safe to build on)

These are the project's genuinely well-supported findings, independent of the v0.4.7 token-semantics work:

- Modern readable geometry lives in `Contents/DisplayLists`. Face blocks contain positions, a gap marker `[12,100,2,vertexCount]`, normals, Block1, and Block2.
- Block2 decodes loop vertex counts via `(raw+2)/2`; decoded loop counts sum to face vertex count (595/595 tested faces).
- Block1 starts with `ONE` (595/595); Block1 `ONE` count equals Block2 entry count (1,234/1,234); `ONE` values are singleton runs.
- **INV-016**: Block1 body length = `2 × (vertexCount − sectionCount)` (1,234/1,234, and independently reproduced 1,172/1,172 by a third pipeline in v0.4.5).
- **INV-017**: every ONE-delimited section body token count = `Block2[i] − 1` (8,763/8,763 sections, 1,234/1,234 faces; independently reproduced).
- **INV-018**: sum of Block2 values = Block1 body length (a *mathematical consequence* of INV-017, not independent — documented as such).
- **INV-019**: `secCount`/alternative-`[4,8,2,N]`-header presence correlate with zero exceptions across 1,172 faces (secCount=1⟺N=1, secCount=2⟺N=2, secCount≥3⟺none). Explicitly recorded as **correlation, not causal** — do not silently upgrade.
- The Block1→Block2 offset formula is `block2Start = block1Start + (N+4)*4`, with `N` read from `block1Start+12` after validating header shape `[4,8,2,N]`. (A prior bug read `block1Start + b1Word0*4`, which always evaluated to `block1Start+16` — Block1's own body, not Block2. Corrected in v0.4.5; see `v0.4.5/CORRECTION_NOTE.md`.)
- `parser/v0.1` reproduces all of the above at 1,172/1,172 exact parity against the v0.4.5/v0.4.6 reference data.

Everything from v0.4.7 (EXP-027–038) below is at Hypothesis/Correlation/Strong-Evidence/Complete-observation status, not invariant status — treat accordingly.

---

## Recent Experiments (EXP-027 → EXP-038, v0.4.7) — audited 2026-08-14, extended 2026-08-15

Short status per experiment (full detail: `knowledge/EXPERIMENT_LOG.md`, `knowledge/evidence/2026-08-14_v0.4.7-EXP0{27..36}.md`, and the audit file below):

| Exp | What it found | Audit status |
|---|---|---|
| EXP-027 | Byte-level differential of C00–C10 pairs (scale/translate/hole/fillet/chamfer/shell). | **Two of five key findings later contradicted/weakened** by EXP-028 (see below); the entry now carries an in-place correction note. |
| EXP-028 | Falsification pass on EXP-027. | Sound. Falsified "linear VC↔diameter scaling" (ratio mismatch, n=2) and weakened "localized to affected faces" (DL is fully re-serialized on any change). Also established SLDPRT vertices are tessellated approximations, not exact B-rep (3–12.5% exact match to STEP). |
| EXP-029 | Cube-face tokens identical across models with same geometry; cylindrical-face tokens identical up to length regardless of diameter; face matching by ec/vc/secCount alone is ambiguous. | Sound. Correctly resolved face-matching ambiguity by switching to orientation-via-normal matching in later experiments (non-circular w.r.t. the tokens being studied). |
| EXP-030 | No structural correspondence between Block1 tokens and vertex indices/edge counts/loop sizes/Block2 values. B1Len formula explained. | Sound. |
| EXP-031 | Cylindrical faces share one token signature regardless of diameter; planar cube faces have 9 diverse signatures (by orientation); C11 discrepancy resolved (was a face-classification bug, not a real anomaly). | Sound. |
| EXP-032 | Token signatures correlate with face orientation for planar cube faces; C03/C09 (fillet/chamfer) have modified +X/+Y signatures vs. everything else. | Sound. |
| EXP-033 | Fillet and chamfer both change +X/+Y token signatures even though those faces are structurally unmodified (ec/vc/secCount/b1Len identical); hole models do not. Framed as "global model state" (H5) causing the effect. | **H4 ("not caused by adjacency") is NOT genuinely tested** — the adjacency check is a same-orientation-label heuristic, not real topology, and is structurally incapable of detecting the true adjacency between the fillet/chamfer edge and the +X/+Y faces. Downgraded to Unknown; see Finding A below. H1/H2/H3/H5/H6 unaffected. |
| EXP-034 | Block1/Block2 completely invariant under 2× scale and one translation vector; only vertex coordinates change. | Sound, narrowly scoped (one scale factor, one translation vector) — appropriately hedged in its own writeup. |
| EXP-035 | C10 (shell) *is* parseable (EXP-033's "unparseable" was a face-type filter bug); shell leaves existing outer faces token-identical to C00 and adds 5 new inner-wall faces with unique tokens. | Sound; this is the source of ground truth used to catch the EXP-036 bug below. |
| EXP-036 | Fillet/chamfer add 1 new face; the cross-model table claims holes/shell add 0. Concludes "adding a new face at an edge" (H8) is the discriminator. | **The "added=0 for holes/shell" statistic is a measurement bug**, not a real count (orientation-bucket collision silently drops C04's new cylindrical face and all 5 of C10's new faces — see Finding B below). "Adds a face" is not, by itself, the discriminator (everyone tested adds a face). H4/H6/H7 correctly left as Unknown in the raw evidence (not falsified) — the summary table overstates certainty. |
| EXP-037 (2026-08-14, NQ-028 attempt 1) | Checked whether the corpus could answer NQ-028 (does the effect move to a different edge?) — it could not at the time (only one edge-feature location existed, archived or on disk). Built and validated corrected tooling instead: real vertex/edge-sharing adjacency (`computeAdjacency`) and centroid-distance face correspondence with ambiguity flagging (`matchFaces`), fixing Findings A and B respectively. Applied to the one edge in the corpus: the new fillet/chamfer face's real adjacency set is exactly {+X,+Y,+Z,-Z} = exactly the token-changed set. | Sound, and self-consistent: reproduces EXP-027/EXP-035's added-face counts independently (0 discrepancies) and reproduces EXP-032/033's token-changed-face set independently. Correlational and single-edge only — did not establish causation or answer NQ-028's core question at the time. Shell contrast (new inner walls ARE adjacent to unmodified, token-unchanged outer walls) shows the fillet/chamfer correlation does not generalize to a universal "adjacency causes change" rule. |
| EXP-038 (2026-08-15, NQ-028 executed) | Answers NQ-028's core question using C12, a real second-edge fillet model (1mm, edge shared by -X/-Y) supplied by the user, verified from its own STEP file, parsed directly (not from archive). Compared against C00/C03 with EXP-037's tooling. **Result: the token-changed face set relocated from {+X,+Y} (C03) to {-X,-Y} (C12)** — exactly the faces bordering the NEW edge, structurally unmodified in both, matching each model's own real adjacency set exactly. Face index also changed ({2,3}→{0,1}). | Sound. Found and fixed a real tooling gap in the process (see "Methodological Constraints" below): EXP-037's vertex-average centroid, applied to real C12 data, put two genuine same-face correspondences (0.0042–0.0046m shift) dangerously close to the threshold (0.004m) and to the new-face/unrelated-face distance (~0.0045m) — switched to bounding-box center, re-validated against all five archived pairs (not just C12) before adopting. Explicitly does not resolve the mechanism, and explicitly flags that "real adjacency" and "direct vertex modification of the neighboring face" are indistinguishable for edge-type features in this corpus (both predict the identical face set). n=2 edges is still a small, though clean and unambiguous, sample. |

**Full audit writeup**: `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Findings A–E, with exact script lines and JSON reproduction). **EXP-037 writeup**: `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md`. **EXP-038 writeup**: `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`.

---

## Recently Falsified / Downgraded Hypotheses (do not revive without new evidence)

- Hole-diameter → cylindrical-vc **linear** scaling (FH, EXP-028).
- Feature changes are **localized** in the binary representation (weakened, EXP-028) — DL is re-serialized wholesale on any face change.
- SLDPRT vertices are exact B-rep vertices (falsified, EXP-028) — they are DisplayList tessellation, ~10μm off.
- Block1 tokens encode geometry-specific parameters / diameter (falsified, EXP-029).
- Block1 tokens are vertex/edge indices (falsified, EXP-030 — token values exceed vertex count).
- All planar faces share one token signature (falsified, EXP-031). All cylindrical faces share one (supported).
- Token signature depends on face index, or vertex position alone (falsified, EXP-032).
- Token signature changes are caused by local topology, or by direct feature modification (falsified, EXP-033 — legitimate, not affected by the adjacency-test bug).
- **Token signature changes are caused by adjacency to modified geometry — do NOT treat as falsified.** EXP-033's "H4 FALSIFIED" is invalid (see above). **Updated 2026-08-14 (EXP-037): this is no longer merely "Unknown."** A real, vertex-coordinate-based adjacency computation now directly confirms, for the one edge this corpus contains (at the time), that the fillet/chamfer's new face is genuinely adjacent (shares an edge) to exactly the set of faces whose tokens changed (+X/+Y/+Z/-Z) and not to the unchanged faces (-X/-Y). **Updated again 2026-08-15 (EXP-038): now confirmed on a SECOND, independent edge** (C12, -X/-Y) — the same pattern repeated, mirrored exactly ({-X,-Y,+Z,-Z} adjacent = changed). Current status: **Strong Evidence, n=2 independently tested edges** — still not a general Verified invariant (the shell contrast shows adjacency isn't universally sufficient for a token change across feature types; "real adjacency" and "direct vertex modification of the neighbor face" remain indistinguishable for edge-type features specifically — see EXP-038 §6–§7). A fresh session should not cite "signature changes are known not to depend on adjacency" as established (that was always wrong), but also should not claim the adjacency link is proven causal, general across feature types, or established beyond two tested edges — see `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`.
- Shell causes token changes on existing faces (falsified, EXP-035 — shell's existing outer faces are token-identical to baseline).
- Number of faces, or presence of multi-loop faces, distinguishes fillet/chamfer from hole/shell (falsified, EXP-036 — legitimate).
- Block1 tokens change under scale/translation (falsified, EXP-034).

---

## Current Unknowns (most important)

1. **What do Block1/Block2 token values actually encode?** Not vertex/edge indices, not diameter, not absolute coordinates, not simple structural counts. Currently unknown; "tessellation parameters" and "face orientation-derived values" are open hypotheses (OQ-034).
2. **Why do fillet/chamfer (but not hole/shell) change tokens on structurally-unrelated faces?** "Global model state" (EXP-033 H5) is supported at the level of *correlation*. The narrower "adjacent to a new face" explanation is now directly measured (not just inferred) for TWO tested edges (EXP-037: +X/+Y; EXP-038: -X/-Y) — real vertex/edge-sharing adjacency exists between the new fillet/chamfer face and exactly the changed-token set, in both cases. The *mechanism* (why adjacency, or the associated direct vertex modification, would produce a token change) is still unknown, and adjacency-to-a-new-face is NOT universally sufficient across feature types (shell's adjacent new inner walls do not change their neighboring outer walls' tokens) — so this is a fillet/chamfer-specific correlation, not a general law. See NQ-027/NQ-028 below.
3. **Is the +X/+Y effect location-specific or location-independent?** **ANSWERED 2026-08-15 (EXP-038): location-specific.** Using a real second-edge model (C12, -X/-Y, supplied by the user), the changed-face set relocated to match the new edge exactly. This directly falsifies the "always +X/+Y, always face index 2/3, regardless of location" alternative. Not yet known: whether this generalizes beyond vertical edges of a 10mm cube, or beyond 1mm fillets — untested (n=2, same cube, same feature size). See `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`.
4. **What determines which faces get the alternative `[4,8,2,N]` header, and what does N mean?** Still open (OQ-018), tightly correlated with `secCount` (INV-019) but causality/semantics unresolved.
5. **Adjacency vs. direct vertex modification, newly identified by EXP-038.** For edge-type features (fillet/chamfer), "this face is genuinely topologically adjacent (shares an edge) with the new feature face" and "this face's own vertices were directly, if minutely, modified by the trim" pick out the identical face set — an edge fillet by construction trims exactly its two bordering faces. This corpus cannot separate these two candidate triggers. A feature type that adds a new adjacent face WITHOUT perturbing the neighboring face's own vertices (none exists in the current corpus) would be needed to resolve it.

---

## Active Investigation

**NQ-028 is answered as of 2026-08-15 (EXP-038)** — see "Recent Experiments" above. There is currently no active experiment in progress; EXP-038 was explicitly instructed not to begin another one.

NQ-027 ("why does adding a face at an edge cause global token changes") remains the nominal open thread, but is now narrower than before EXP-037/038: (a) a real topological adjacency computation and (b) an orientation-independent face-correspondence algorithm both exist and are validated, and (c) location-generality across two edges is now confirmed. What remains is the mechanism question (why adjacency/direct-modification triggers a token change) and the adjacency-vs-direct-modification confound (see Current Unknowns #5) — neither has a clear next experiment identified within the current corpus's feature-type vocabulary.

---

## Possible Future Directions (not started, not recommended for immediate execution)

Per instruction, EXP-038 does not begin another experiment, and this handoff does not designate one as "next." For context only, if a future session picks this up:

- **A horizontal-edge fillet/chamfer** (e.g. shared by +X and +Z) would test whether the location-tracking result generalizes beyond vertical edges of this cube — n=2 so far are both vertical, related by the cube's symmetry.
- **A feature that adds a new adjacent face without perturbing the neighboring face's own vertices** would be needed to separate "real topological adjacency" from "direct vertex modification of the neighbor" (Current Unknowns #5) — no such feature type exists in the current corpus; edge features (fillet/chamfer) inherently confound the two.
- Neither of these is begun, scripted, or scheduled by this session.

---

## Methodological Constraints (binding on future sessions)

- Do not treat "same orientation label" as a substitute for real topological adjacency. `isAdjacentToModified()` in `v0.4.7/exp033_feature_state.js` is not a valid adjacency test; do not reuse its logic. **A valid replacement now exists and is validated**: `computeAdjacency()` in `v0.4.7/exp037_edge_location_and_adjacency.js` (real vertex/edge-sharing, ≥2 coincident vertices). Use it (or an equivalent computed-from-vertex-coordinates test), not orientation labels.
- Do not use `v0.4.7/exp036_feature_class_differential.js`'s `computeTokenDiff()` "added" count as a face-addition census — it silently drops new faces whose orientation collides with an existing face's orientation bucket (confirmed for both hole and shell models). **A valid replacement now exists and is validated**: `matchFaces()` in `v0.4.7/exp037_edge_location_and_adjacency.js` / `v0.4.7/exp038_nq028_c12_second_edge.js` (centroid-distance correspondence with explicit ambiguity flagging — do not use raw vertex-overlap fraction as the primary correspondence key either; see the methodological note in `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md` §2 explaining why that also produces false ambiguity on symmetric cube geometry). If you need a quick reliable "was a face added" signal without running the full tool, comparing raw face counts (as `CORPUS_AUDIT.json` and EXP-035 did) is still valid for that narrower question.
- **Use bounding-box center, not raw vertex-average, for face-correspondence "centroid" distance** (updated 2026-08-15, EXP-038). EXP-037's original `matchFaces()` used the raw vertex average, which is sensitive to non-uniform tessellation density — validated fine against C03/C09/C04/C10, but produced a dangerously thin (and, for two specific faces, actually broken) margin when tested against real C12 data, because a finely-subdivided fillet arc pulls the average toward itself. `exp038_nq028_c12_second_edge.js`'s `matchFaces()` uses each face's axis-aligned bounding-box center instead (depends on extent, not point density), with threshold 0.002m — re-validated across all five archived pairs before adoption, not tuned to C12 alone. Prefer bounding-box center for any future face-correspondence work on this corpus; see `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md` §3 for the full derivation. `exp037_edge_location_and_adjacency.js`'s own file/results were not modified.
- Face matching across models must use geometry (orientation-via-normal as in EXP-031 onward, or centroid/bbox-center-distance correspondence as in EXP-037/038) or another non-circular signal — never Block1/Block2 token equality/similarity, since that is the very thing under investigation (this rule was already being followed correctly as of EXP-031+; EXP-029's earlier face-index-based matching should be treated as weaker evidence).
- Do not promote a Hypothesis/Correlation-status finding from EXP-027–038 to `KNOWN_INVARIANTS.md` without a discriminating experiment, per the project's existing rule (`RESEARCH_DASHBOARD.md` "When adding a VALUE hypothesis"). As of 2026-08-15 (including EXP-038), none has been promoted — keep it that way for the token-signature findings specifically. EXP-038's "Strong Evidence" adjacency finding is explicitly n=2-edges and correlational (not causal, and confounded with direct vertex modification for edge features — see Current Unknowns #5); do not round it up to Verified/invariant status.
- When a later experiment falsifies or weakens an earlier one (as EXP-028 did to EXP-027), add an in-place correction note to the earlier entry in `EXPERIMENT_LOG.md`, not just a new entry — this was previously not being done consistently and has now been retrofitted for EXP-027/EXP-033/EXP-036.
- Historical evidence is append-only. Never rewrite an original experiment entry's conclusions text; append clearly dated correction notes instead (see the pattern used throughout this session's edits and the pre-existing INV-012/EXP-023/024 correction notes).
- Do not commit or push unless explicitly instructed by the user in that session. See Repository State below for what is currently uncommitted.

---

## Parser Status

`parser/v0.1` (isomorphic Node/browser SLDPRT geometry parser + viewer) is built on the validated state through v0.4.6 and passes exact parity (1,172/1,172 faces) against the v0.4.5/v0.4.6 reference data. It is unrelated to and unaffected by the v0.4.7 research or this audit — no v0.4.7 finding is invariant-level, so there is nothing to backport yet. Do not modify `parser/` as part of research-audit work (out of scope per this task and per the project's parser/research separation).

---

## Repository State

- The audit's and EXP-037's commits (from a prior session) were pushed to the remote `claude` branch (fast-forward, commit `0b417a2` at time of writing) before this EXP-038 session began; the local working branch here is `claude-ff`, tracking `origin/claude`. Working tree as of this update (post-EXP-038) has **uncommitted changes** on top of that pushed state:
  - Modified: `knowledge/EXPERIMENT_LOG.md`, `knowledge/FAILED_HYPOTHESES.md`, `knowledge/NEXT_QUESTIONS.md`, `knowledge/OPEN_QUESTIONS.md`, `knowledge/RESEARCH_DASHBOARD.md`, `knowledge/RESEARCH_HANDOFF.md` (this file).
  - Added: `knowledge/evidence/2026-08-15_v0.4.7-EXP038.md`, `v0.4.7/exp038_nq028_c12_second_edge.js`, `v0.4.7/EXP038_RESULTS.json`, `v0.4.7/EXP038_SUMMARY.md`.
  - Added (new, untracked directory): `test files original/controlled/C12_cube_fillet_1mm_edge2/` containing `model.SLDPRT`, `model.step`, `model.STL` — the real second-edge fillet model supplied by the user for this experiment. This is the first time any file exists under `test files original/controlled/` in this repository.
  - `parser/` was **not** touched. No other file under `test files original/` besides the new `controlled/C12_cube_fillet_1mm_edge2/` directory was touched (C00–C11 remain absent, as before).
- No commit or push was performed for this EXP-038 session's work (out of scope unless the user explicitly requests it in-session — the prior EXP-037/audit push was done only after explicit instruction via a stop-hook prompt in that session).
- Relevant version directories: `v0.4.7/` holds all EXP-027–038 scripts and raw JSON. `v0.4.5`/`v0.4.6` hold the corrected Block1→Block2 offset work and INV-019. `parser/v0.1` holds the implementation. `test files original/controlled/C12_cube_fillet_1mm_edge2/` now holds one real controlled-corpus model (see above); C00–C11 remain archive-only (JSON under `v0.4.7/`, no SLDPRT files anywhere in this environment).
- Corpus reference table (non-controlled files) is in `RESEARCH_DASHBOARD.md` "Current Corpus" (unchanged — C12 is tracked separately as part of the controlled corpus, not added to that table); the controlled C00–C11 corpus is described in `v0.4.7/RESEARCH_PLAN_EXP029.md` and `v0.4.7/CORPUS_AUDIT.json` (C11 present in later scripts but absent from `CORPUS_AUDIT.json`). NQ-028 is now answered (see above); no further edge/feature model is currently requested or planned.
