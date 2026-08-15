# Research Handoff

Compact, operational, persistent handoff between short-lived Cowork/Claude Code sessions on the SLDPRT reverse-engineering project. This is a navigation document, not the evidence archive — verify important claims against `knowledge/evidence/` and the underlying scripts/JSON before relying on them. This file did not exist before 2026-08-14; it was created by an archivist/debunker audit session that reviewed EXP-027 through EXP-036, and was updated the same day by the session that ran EXP-037 (NQ-028 attempt). If you are a fresh session, read this file first, then `RESEARCH_DASHBOARD.md`, then the specific evidence files referenced below.

**Last updated**: 2026-08-14, by the EXP-037 session (attempted NQ-028; corpus insufficient, so built/validated corrected adjacency+correspondence tooling instead and documented the exact new-model requirement — see "Recent Experiments" and "Recommended Next Experiment" below). Before that: 2026-08-14, by an archivist/debunker audit session (no new experiment executed; corrected/annotated existing knowledge base).

---

## Current Research Phase

Block1/Block2 token-semantics investigation using a controlled, single-feature-at-a-time corpus (v0.4.7, `test files original/controlled/C00`–`C11`: a 10mm cube with one geometric change each — scale, translation, hole diameter/position, fillet, chamfer, shell). This follows the completed and corrected alternative-header/serialization-container analysis (v0.4.3–v0.4.5, closed out by EXP-026/INV-019 in v0.4.6).

**Note:** the controlled corpus SLDPRT files themselves are not present in this repository snapshot (`test files original/controlled/` does not exist here) — only their JSON/MD outputs under `v0.4.7/` and `knowledge/evidence/` are archived. Any session that wants to re-run or extend v0.4.7 experiments needs the original corpus files, which are referenced by relative path in every v0.4.7 script but not checked into this dump. **Reconfirmed 2026-08-14 by EXP-037** via a full-filesystem search (`find / -iname "*.sldprt"`) — no controlled-corpus files exist anywhere in this environment, not just outside the repo checkout. This is the reason NQ-028 could not be executed (see below) and will block any future experiment that needs to parse a *new* model, not just re-analyze archived JSON.

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

Everything from v0.4.7 (EXP-027–036) below is at Hypothesis/Correlation/Complete-observation status, not invariant status — treat accordingly.

---

## Recent Experiments (EXP-027 → EXP-036, v0.4.7) — audited 2026-08-14

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
| EXP-037 (2026-08-14, NQ-028 attempt) | Checked whether the corpus could answer NQ-028 (does the effect move to a different edge?) — it cannot (only one edge-feature location exists, archived or on disk). Built and validated corrected tooling instead: real vertex/edge-sharing adjacency (`computeAdjacency`) and centroid-distance face correspondence with ambiguity flagging (`matchFaces`), fixing Findings A and B respectively. Applied to the one edge in the corpus: the new fillet/chamfer face's real adjacency set is exactly {+X,+Y,+Z,-Z} = exactly the token-changed set. | Sound, and self-consistent: reproduces EXP-027/EXP-035's added-face counts independently (0 discrepancies) and reproduces EXP-032/033's token-changed-face set independently. Correlational and single-edge only — does not establish causation and does not answer NQ-028's core question. Shell contrast (new inner walls ARE adjacent to unmodified, token-unchanged outer walls) shows the fillet/chamfer correlation does not generalize to a universal "adjacency causes change" rule. |

**Full audit writeup**: `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Findings A–E, with exact script lines and JSON reproduction). **EXP-037 writeup**: `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md`.

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
- **Token signature changes are caused by adjacency to modified geometry — do NOT treat as falsified.** EXP-033's "H4 FALSIFIED" is invalid (see above). **Updated 2026-08-14 (EXP-037): this is no longer merely "Unknown."** A real, vertex-coordinate-based adjacency computation now directly confirms, for the one edge this corpus contains, that the fillet/chamfer's new face is genuinely adjacent (shares an edge) to exactly the set of faces whose tokens changed (+X/+Y/+Z/-Z) and not to the unchanged faces (-X/-Y). Current status: **Strong Evidence for fillet/chamfer, single edge** — not a general Verified invariant (the shell contrast shows adjacency isn't universally sufficient for a token change across feature types), and not yet extended to a second edge location (NQ-028, blocked on a new model). A fresh session should not cite "signature changes are known not to depend on adjacency" as established, and should also not claim the adjacency link is proven causal or general — see `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md`.
- Shell causes token changes on existing faces (falsified, EXP-035 — shell's existing outer faces are token-identical to baseline).
- Number of faces, or presence of multi-loop faces, distinguishes fillet/chamfer from hole/shell (falsified, EXP-036 — legitimate).
- Block1 tokens change under scale/translation (falsified, EXP-034).

---

## Current Unknowns (most important)

1. **What do Block1/Block2 token values actually encode?** Not vertex/edge indices, not diameter, not absolute coordinates, not simple structural counts. Currently unknown; "tessellation parameters" and "face orientation-derived values" are open hypotheses (OQ-034).
2. **Why do fillet/chamfer (but not hole/shell) change tokens on structurally-unrelated faces (+X/+Y)?** "Global model state" (EXP-033 H5) is supported at the level of *correlation*. **Updated 2026-08-14 (EXP-037)**: the narrower "adjacent to a new face" explanation is now directly measured (not just inferred) for the one tested edge — real vertex/edge-sharing adjacency exists between the new fillet/chamfer face and exactly {+X,+Y,+Z,-Z}, the token-changed set. The *mechanism* (why adjacency would produce a token change) is still unknown, and EXP-037 also shows adjacency-to-a-new-face is NOT universally sufficient across feature types (shell's adjacent new inner walls do not change their neighboring outer walls' tokens) — so this is a fillet/chamfer-specific correlation, not a general law. See NQ-027/NQ-028 below.
3. **Is the +X/+Y effect location-specific or location-independent?** Still untested — C03 and C09 both modify the same physical edge (confirmed directly by EXP-037's vertex-based adjacency computation, not just face-index inspection). EXP-037 (2026-08-14) attempted to resolve this and found the corpus/environment cannot: no second-edge model exists anywhere (archived JSON or SLDPRT files, and no SLDPRT files exist in this environment at all). A new model is required — exact spec in `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md` §6 and `NEXT_QUESTIONS.md` NQ-028. The analysis tooling to answer this once the model exists is already built and validated (`v0.4.7/exp037_edge_location_and_adjacency.js`).
4. **What determines which faces get the alternative `[4,8,2,N]` header, and what does N mean?** Still open (OQ-018), tightly correlated with `secCount` (INV-019) but causality/semantics unresolved.

---

## Active Investigation

NQ-027 ("why does adding a face at an edge cause global token changes") is the nominal active thread, but per the 2026-08-14 audit it should not be pursued via a repeat of EXP-036's methodology (orientation-bucket face matching) — and, per EXP-037 (also 2026-08-14), that methodological fix has now been made: (a) a real topological adjacency computation and (b) an orientation-independent face-correspondence algorithm both exist and are validated (`v0.4.7/exp037_edge_location_and_adjacency.js`). What's still missing is (c) a second edge-feature location to test location-generality — EXP-037 confirmed no such model exists anywhere in this environment (archived or on disk) and specified exactly what needs to be generated (see below). This is now the sole remaining blocker for NQ-027/NQ-028.

---

## Recommended Next Experiment

**NQ-028, continued from EXP-037 (2026-08-14)**: Generate one additional controlled model — the same C00 base cube with a 1mm fillet or chamfer applied to a *different* edge than the one used in C03/C09 (e.g., the edge shared by -X/-Y instead of +X/+Y; suggested name `C12_cube_fillet_1mm_edge2`). Full specification, including exactly what must stay controlled, is in `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md` §6. Extract full per-face vertex arrays the way `v0.4.7/vertex_analysis.js` does (needs a SolidWorks session or equivalent to produce the `.SLDPRT`; this environment currently has no SLDPRT files or SolidWorks access at all, so a fresh session may need external help to obtain the file, then only needs to add a `C00_cube_10mm_vs_C12_...`-shaped entry to a `VERTEX_ANALYSIS.json`-like file, then run EXP-037's `analyzePair`).

- If the changed faces move to match the new edge location → supports genuine adjacency/topology causation; would generalize EXP-037's single-edge "Strong Evidence" finding into a validated causal-candidate rule, and would justify permanently retiring `isAdjacentToModified()` in `exp033_feature_state.js` in favor of `computeAdjacency()`.
- If the changed faces remain +X/+Y regardless of which edge was modified → falsifies the adjacency explanation as general (even though it held for this one edge); points toward a feature-type-specific or monotonically-increasing internal-state explanation instead.

This is still the highest-information-gain single experiment available for NQ-027/NQ-028: it cleanly falsifies or generalizes the one live explanation with one new model, and **no new tooling is needed** — `exp037_edge_location_and_adjacency.js`'s `analyzePair`/`matchFaces`/`computeAdjacency` are already generic to any (baseline, feature-model) pair. **Not automatically begun by EXP-037** — it is a recommendation only, same as when the audit first proposed it.

---

## Methodological Constraints (binding on future sessions)

- Do not treat "same orientation label" as a substitute for real topological adjacency. `isAdjacentToModified()` in `v0.4.7/exp033_feature_state.js` is not a valid adjacency test; do not reuse its logic. **A valid replacement now exists and is validated**: `computeAdjacency()` in `v0.4.7/exp037_edge_location_and_adjacency.js` (real vertex/edge-sharing, ≥2 coincident vertices). Use it (or an equivalent computed-from-vertex-coordinates test), not orientation labels.
- Do not use `v0.4.7/exp036_feature_class_differential.js`'s `computeTokenDiff()` "added" count as a face-addition census — it silently drops new faces whose orientation collides with an existing face's orientation bucket (confirmed for both hole and shell models). **A valid replacement now exists and is validated**: `matchFaces()` in `v0.4.7/exp037_edge_location_and_adjacency.js` (centroid-distance correspondence with explicit ambiguity flagging — do not use raw vertex-overlap fraction as the primary correspondence key either; see the methodological note in `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md` §2 explaining why that also produces false ambiguity on symmetric cube geometry). If you need a quick reliable "was a face added" signal without running the full tool, comparing raw face counts (as `CORPUS_AUDIT.json` and EXP-035 did) is still valid for that narrower question.
- Face matching across models must use geometry (orientation-via-normal as in EXP-031 onward, or centroid-distance correspondence as in EXP-037) or another non-circular signal — never Block1/Block2 token equality/similarity, since that is the very thing under investigation (this rule was already being followed correctly as of EXP-031+; EXP-029's earlier face-index-based matching should be treated as weaker evidence).
- Do not promote a Hypothesis/Correlation-status finding from EXP-027–037 to `KNOWN_INVARIANTS.md` without a discriminating experiment, per the project's existing rule (`RESEARCH_DASHBOARD.md` "When adding a VALUE hypothesis"). As of 2026-08-14 (including EXP-037), none has been promoted — keep it that way for the token-signature findings specifically. EXP-037's "Strong Evidence" adjacency finding is explicitly single-edge and correlational; do not round it up to Verified/invariant status.
- When a later experiment falsifies or weakens an earlier one (as EXP-028 did to EXP-027), add an in-place correction note to the earlier entry in `EXPERIMENT_LOG.md`, not just a new entry — this was previously not being done consistently and has now been retrofitted for EXP-027/EXP-033/EXP-036.
- Historical evidence is append-only. Never rewrite an original experiment entry's conclusions text; append clearly dated correction notes instead (see the pattern used throughout this session's edits and the pre-existing INV-012/EXP-023/024 correction notes).
- Do not commit or push unless explicitly instructed by the user in that session. See Repository State below for what is currently uncommitted.

---

## Parser Status

`parser/v0.1` (isomorphic Node/browser SLDPRT geometry parser + viewer) is built on the validated state through v0.4.6 and passes exact parity (1,172/1,172 faces) against the v0.4.5/v0.4.6 reference data. It is unrelated to and unaffected by the v0.4.7 research or this audit — no v0.4.7 finding is invariant-level, so there is nothing to backport yet. Do not modify `parser/` as part of research-audit work (out of scope per this task and per the project's parser/research separation).

---

## Repository State

- Branch: `claude/vibrant-cori-ik6jju` (this environment's working branch for the session that ran EXP-037; separately tracks a `main` branch too). Working tree as of this update has **uncommitted changes** — the original archivist audit's edits (applied via cherry-pick from a separately-supplied bundle at the start of the EXP-037 session, since this checkout had not yet received them) plus this session's own EXP-037 work:
  - Modified: `README.md`, `knowledge/EXPERIMENT_LOG.md`, `knowledge/FAILED_HYPOTHESES.md`, `knowledge/NEXT_QUESTIONS.md`, `knowledge/OPEN_QUESTIONS.md`, `knowledge/RESEARCH_DASHBOARD.md`.
  - Added (audit): `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`.
  - Added (EXP-037): `knowledge/evidence/2026-08-14_v0.4.7-EXP037.md`, `v0.4.7/exp037_edge_location_and_adjacency.js`, `v0.4.7/EXP037_RESULTS.json`, `v0.4.7/EXP037_SUMMARY.md`.
  - This file (`knowledge/RESEARCH_HANDOFF.md`) is added-then-modified (created by the audit, updated by EXP-037).
  - `parser/` and `test files original/` were **not** touched by either the audit or EXP-037.
- No commit or push was performed for either the audit's changes or EXP-037's work (out of scope unless the user explicitly requests it in-session).
- Relevant version directories: `v0.4.7/` holds all EXP-027–037 scripts and raw JSON (the controlled corpus SLDPRT files themselves are **not** in this repo snapshot, and are not present anywhere in this environment — see Current Research Phase above). `v0.4.5`/`v0.4.6` hold the corrected Block1→Block2 offset work and INV-019. `parser/v0.1` holds the implementation.
- Corpus reference table (non-controlled files) is in `RESEARCH_DASHBOARD.md` "Current Corpus"; the controlled C00–C11 corpus is described in `v0.4.7/RESEARCH_PLAN_EXP029.md` and `v0.4.7/CORPUS_AUDIT.json` (C11 present in later scripts but absent from `CORPUS_AUDIT.json`). No C12+ model exists yet — generating one (per NQ-028's spec) is the recommended next step.
