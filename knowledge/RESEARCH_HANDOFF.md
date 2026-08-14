# Research Handoff

Compact, operational, persistent handoff between short-lived Cowork/Claude Code sessions on the SLDPRT reverse-engineering project. This is a navigation document, not the evidence archive — verify important claims against `knowledge/evidence/` and the underlying scripts/JSON before relying on them. This file did not exist before 2026-08-14; it was created by an archivist/debunker audit session that reviewed EXP-027 through EXP-036. If you are a fresh session, read this file first, then `RESEARCH_DASHBOARD.md`, then the specific evidence files referenced below.

**Last updated**: 2026-08-14, by an archivist/debunker audit session (no new experiment executed; corrected/annotated existing knowledge base).

---

## Current Research Phase

Block1/Block2 token-semantics investigation using a controlled, single-feature-at-a-time corpus (v0.4.7, `test files original/controlled/C00`–`C11`: a 10mm cube with one geometric change each — scale, translation, hole diameter/position, fillet, chamfer, shell). This follows the completed and corrected alternative-header/serialization-container analysis (v0.4.3–v0.4.5, closed out by EXP-026/INV-019 in v0.4.6).

**Note:** the controlled corpus SLDPRT files themselves are not present in this repository snapshot (`test files original/controlled/` does not exist here) — only their JSON/MD outputs under `v0.4.7/` and `knowledge/evidence/` are archived. Any session that wants to re-run or extend v0.4.7 experiments needs the original corpus files, which are referenced by relative path in every v0.4.7 script but not checked into this dump.

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

**Full audit writeup**: `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md` (Findings A–E, with exact script lines and JSON reproduction).

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
- **Token signature changes are caused by adjacency to modified geometry — do NOT treat as falsified.** EXP-033's "H4 FALSIFIED" is invalid (see above); the correct status is Unknown. This is the single most important corrected item in this handoff — a fresh session should not cite "signature changes are known not to depend on adjacency" as established.
- Shell causes token changes on existing faces (falsified, EXP-035 — shell's existing outer faces are token-identical to baseline).
- Number of faces, or presence of multi-loop faces, distinguishes fillet/chamfer from hole/shell (falsified, EXP-036 — legitimate).
- Block1 tokens change under scale/translation (falsified, EXP-034).

---

## Current Unknowns (most important)

1. **What do Block1/Block2 token values actually encode?** Not vertex/edge indices, not diameter, not absolute coordinates, not simple structural counts. Currently unknown; "tessellation parameters" and "face orientation-derived values" are open hypotheses (OQ-034).
2. **Why do fillet/chamfer (but not hole/shell) change tokens on structurally-unrelated faces (+X/+Y)?** "Global model state" (EXP-033 H5) is supported at the level of *correlation*, but the *mechanism* is unknown, and the leading narrower explanation — "adding a face that touches a pre-existing edge" — has not been directly measured (no topology/adjacency computation exists anywhere in the v0.4.7 codebase). See NQ-027/NQ-028 below.
3. **Is the +X/+Y effect location-specific or location-independent?** Untested — C03 and C09 both appear to modify the same physical edge (both consistently change face index 2/3). We do not know whether filleting a *different* edge would move the effect to different faces (supports adjacency) or leave it on +X/+Y regardless (supports a feature-type/global-counter explanation instead).
4. **What determines which faces get the alternative `[4,8,2,N]` header, and what does N mean?** Still open (OQ-018), tightly correlated with `secCount` (INV-019) but causality/semantics unresolved.

---

## Active Investigation

NQ-027 ("why does adding a face at an edge cause global token changes") is the nominal active thread, but per this audit it should not be pursued via a repeat of EXP-036's methodology (orientation-bucket face matching). The corpus and tooling need two things before NQ-027 can be answered: (a) a real topological adjacency computation (edge/vertex sharing, not orientation-label matching), and (b) a second edge-feature location to test location-generality. Neither exists yet.

---

## Recommended Next Experiment

**NQ-028** (newly added to `NEXT_QUESTIONS.md` by this audit): Generate one additional controlled model — the same C00 base cube with a 1mm fillet or chamfer applied to a *different* edge than the one used in C03/C09 (e.g., the edge shared by -X/-Y instead of +X/+Y). Parse it, compute face orientation via normals as in EXP-032/033, and check which faces' token signatures change relative to C00.

- If the changed faces move to match the new edge location → supports genuine adjacency/topology causation; justifies implementing a real edge/vertex-sharing adjacency check (replacing `isAdjacentToModified()` in `exp033_feature_state.js`) and re-running H4.
- If the changed faces remain +X/+Y regardless of which edge was modified → falsifies the adjacency explanation; points toward a feature-type-specific or monotonically-increasing internal-state explanation instead.

This is the highest-information-gain single experiment available: it cleanly falsifies one of exactly two live explanations with one new model and no new tooling, and it also happens to fix the corpus's current confound of testing only one edge location. **This audit did not execute NQ-028** — it is a recommendation only.

---

## Methodological Constraints (binding on future sessions)

- Do not treat "same orientation label" as a substitute for real topological adjacency. `isAdjacentToModified()` in `v0.4.7/exp033_feature_state.js` is not a valid adjacency test; do not reuse its logic without adding genuine edge/vertex-sharing computation.
- Do not use `v0.4.7/exp036_feature_class_differential.js`'s `computeTokenDiff()` "added" count as a face-addition census — it silently drops new faces whose orientation collides with an existing face's orientation bucket (confirmed for both hole and shell models). If you need a reliable "was a face added" signal, compare raw face counts directly (as `CORPUS_AUDIT.json` and EXP-035 correctly did), not the orientation-bucket diff.
- Face matching across models must use geometry (orientation-via-normal, as in EXP-031 onward) or another non-circular signal — never Block1/Block2 token equality/similarity, since that is the very thing under investigation (this rule was already being followed correctly as of EXP-031+; EXP-029's earlier face-index-based matching should be treated as weaker evidence).
- Do not promote a Hypothesis/Correlation-status finding from EXP-027–036 to `KNOWN_INVARIANTS.md` without a discriminating experiment, per the project's existing rule (`RESEARCH_DASHBOARD.md` "When adding a VALUE hypothesis"). As of 2026-08-14, none has been promoted — keep it that way for the token-signature findings specifically.
- When a later experiment falsifies or weakens an earlier one (as EXP-028 did to EXP-027), add an in-place correction note to the earlier entry in `EXPERIMENT_LOG.md`, not just a new entry — this was previously not being done consistently and has now been retrofitted for EXP-027/EXP-033/EXP-036.
- Historical evidence is append-only. Never rewrite an original experiment entry's conclusions text; append clearly dated correction notes instead (see the pattern used throughout this session's edits and the pre-existing INV-012/EXP-023/024 correction notes).
- Do not commit or push. This session made file edits only; see Repository State below.

---

## Parser Status

`parser/v0.1` (isomorphic Node/browser SLDPRT geometry parser + viewer) is built on the validated state through v0.4.6 and passes exact parity (1,172/1,172 faces) against the v0.4.5/v0.4.6 reference data. It is unrelated to and unaffected by the v0.4.7 research or this audit — no v0.4.7 finding is invariant-level, so there is nothing to backport yet. Do not modify `parser/` as part of research-audit work (out of scope per this task and per the project's parser/research separation).

---

## Repository State

- Branch: `claude` (tracks `origin/claude`; `origin/main` also exists). Working tree as of this session has **uncommitted changes**, all research-knowledge-base edits made by this audit:
  - Modified: `knowledge/EXPERIMENT_LOG.md`, `knowledge/FAILED_HYPOTHESES.md`, `knowledge/NEXT_QUESTIONS.md`, `knowledge/OPEN_QUESTIONS.md`, `knowledge/RESEARCH_DASHBOARD.md`.
  - Added: `knowledge/evidence/2026-08-14_archivist-audit-EXP027-036.md`, `knowledge/RESEARCH_HANDOFF.md` (this file).
  - `parser/` was **not** touched.
- No commit or push was performed (out of scope for this session; the user must explicitly request it).
- Relevant version directories: `v0.4.7/` holds all EXP-027–036 scripts and raw JSON (the controlled corpus SLDPRT files themselves are **not** in this repo snapshot — see Current Research Phase above). `v0.4.5`/`v0.4.6` hold the corrected Block1→Block2 offset work and INV-019. `parser/v0.1` holds the implementation.
- Corpus reference table (non-controlled files) is in `RESEARCH_DASHBOARD.md` "Current Corpus"; the controlled C00–C11 corpus is described in `v0.4.7/RESEARCH_PLAN_EXP029.md` and `v0.4.7/CORPUS_AUDIT.json` (C11 present in later scripts but absent from `CORPUS_AUDIT.json`).
