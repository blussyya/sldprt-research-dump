# EXP-039: Is Direct Vertex Modification Necessary for a Token Change?

**Date**: 2026-08-16
**Version**: v0.4.7

---

## 0. Continuity note

This session was briefed as a continuation after EXP-037/EXP-038 (adjacency correction
and the C12 second-edge test). It initially worked from a stale branch
(`claude/sldprt-research-exp038-lxgtz6`) cut before EXP-037/038 existed, and — not
finding them — built an independent, from-scratch re-derivation under the same EXP-037
name. That work is superseded by this experiment once the real `claude` branch (which
already contains the genuine EXP-037/038, plus a 2026-08-14 archivist audit) was found.
EXP-039 below builds directly on the real EXP-037/038 tooling and JSON rather than
restating them. See `knowledge/RESEARCH_HANDOFF.md` for the full continuity note.

## 1. What EXP-037/038 already established (not re-derived here)

- **NQ-028 is answered**: moving the fillet to a second, independent edge (`C12`, real
  SLDPRT file) moved the token-changed face set from {+X,+Y} to {-X,-Y} — exactly the
  faces bordering the new edge. Strong Evidence for the spatial/adjacency-based
  explanation over a fixed global-state explanation (EXP-038).
- **EXP-038 §"What This Does NOT Establish" already names the confound this session was
  asked to resolve**: for any single edge-type feature (fillet/chamfer), "real
  topological adjacency to the new face" and "this face's own vertices were directly, if
  minutely, modified by the trim" pick out the *identical* set of faces, because trimming
  a face's boundary to make room for the new face is what creates the adjacency. EXP-038
  states this cannot be separated for edge-type features with the data available.

## 2. What this session found while verifying that confound: an unused signal

`exp037_edge_location_and_adjacency.js`'s `facesIdentical()` already compares full
per-vertex coordinates (`vertClose(faceA.vertices[i], faceB.vertices[i], 1e-6)` for every
`i`), not just `ec`/`vc`/`secCount`/`b1Len`. Checking the raw output
(`EXP037_RESULTS.json`, `EXP038_RESULTS.json`) directly:

```
C00_cube_10mm_vs_C03_cube_fillet_1mm: aIndex=2 (+X) identical=false
C00_cube_10mm_vs_C03_cube_fillet_1mm: aIndex=3 (+Y) identical=false
C00_cube_10mm_vs_C09_cube_chamfer_1mm: aIndex=2 (+X) identical=false
C00_cube_10mm_vs_C09_cube_chamfer_1mm: aIndex=3 (+Y) identical=false
C12: bIndex=0 (-X) identical=false, bIndex=1 (-Y) identical=false
```

This signal was already computed by the validated tooling but never surfaced in prose:
every EXP-033/037/038 write-up (and `knowledge/FAILED_HYPOTHESES.md` FH-030) still
describes +X/+Y (or -X/-Y for C12) as "not directly modified," based on
`ec`/`vc`/`secCount`/`b1Len` staying constant. The `identical` field they already compute
disagrees: these faces' own vertex *positions* do change (the corner nearest the fillet
moves from `0.01` to `~0.009`), while their vertex *count* and edge *count* stay the same.
`FH-031` (the adjacency hypothesis) was corrected in place on 2026-08-14/15 to reflect the
real adjacency computation; `FH-030` (the direct-modification hypothesis) was never
revisited with this same already-available vertex-identity signal. This experiment
corrects that gap (§5).

## 3. Method

Script: `v0.4.7/exp039_direct_modification_necessity.js`. Reuses
`vertClose`/`sharedVertexCount` copied verbatim (cited in-file) from
`exp037_edge_location_and_adjacency.js`, and reads all correspondence/adjacency/token
data from the already-validated `EXP037_RESULTS.json`, `EXP038_RESULTS.json`, and
`EXP035_RESULTS.json` (for C10's outer-wall token-identity, recorded there directly).
No Block1/Block2 extraction, correspondence, or adjacency logic is re-implemented.

For every face recorded as `identical: true` (i.e., genuinely unmodified — same vertex
positions, not just same ec/vc/secCount/b1Len) in a modified model, computed whether it
is real-adjacent (>=2 shared vertices) to any face recorded as `identical: false` or
newly `added` in that same model, and cross-referenced against the already-validated
token-changed verdict for that face.

EXP-037 already did this qualitatively for one case (shell's inner walls vs. outer
walls). This extends the same check quantitatively across five pairs: C03 (fillet, edge
1), C09 (chamfer, edge 1), C12 (fillet, edge 2), C10 (shell), C04 (hole 5mm).

## 4. Result

| Face | Pair | directlyModified | realAdjacent to changed/added | tokenChanged |
|---|---|---|---|---|
| -X, -Y | C03 (fillet) | false | true | false |
| -X, -Y | C09 (chamfer) | false | true | false |
| -X, -Y, +X, +Y | C04 (hole 5mm) | false | true | false |
| -X, -Y, +X, +Y | C10 (shell) | false | true | false |
| -Z | C10 (shell) | false | **false** (control) | false |
| +X, +Y | C12 (fillet, edge 2) | false | **false** (control) | false |

**12/12** genuinely-unmodified-but-real-adjacent-to-changed-or-added-geometry faces keep
their token unchanged, across four feature types and two independent edge locations.
**3/3** genuinely-unmodified-and-not-adjacent control faces also keep their token
unchanged (as expected — no mechanism predicts otherwise for these).

## 5. Correction to FH-030

`knowledge/FAILED_HYPOTHESES.md` FH-030 ("Token Signatures Depend on Direct Feature
Modification" — Status: Falsified) is corrected in place: the disproving claim ("+X/+Y
are NOT directly modified") relied on `ec`/`vc`/`secCount`/`b1Len` staying constant, but
the already-validated `identical` field (full vertex-coordinate comparison) computed by
the very same EXP-037/038 tooling shows these faces' vertex positions DO change. Every
directly-modified face (by this vertex-position definition) that has a token-comparison
recorded changes token (11/11 across the corpus tested by EXP-033/037/038, no
counterexamples found in this or prior sessions). FH-030 should read Unknown/Corrected,
not Falsified — mirroring the correction already applied to FH-031.

## 6. What remains open

Identical to EXP-038's own stated limits, not newly resolved here:

1. **Mechanism** — why a local, non-uniform vertex change (but not a uniform
   scale/translation, per EXP-034) produces a different token value is still unknown.
2. **Adjacency vs. direct modification, for the co-occurring case** — EXP-039 shows
   adjacency *without* modification is insufficient (12/12), making direct modification
   the parsimonious, uncontradicted explanation. It does not, and structurally likely
   cannot (per the topological argument below), produce a case of modification *without*
   adjacency to test sufficiency in full isolation from adjacency, for any feature that
   edits an existing face's boundary loop to create a new face: gaining a shared boundary
   with a new face is, by construction, itself a change to the neighbor's own boundary.
3. **n remains small** — 4 feature types, 2 edge locations, all on the same 10mm cube.

## 7. Files

- Script: `v0.4.7/exp039_direct_modification_necessity.js`
- Raw results: `v0.4.7/EXP039_DIRECT_MODIFICATION_NECESSITY.json`
- Evidence: `knowledge/evidence/2026-08-16_v0.4.7-EXP039.md`
