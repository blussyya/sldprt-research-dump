# EXP-105 (2026-11-09): why cylinder and cone display vertices sit off their native surface

Cause: the off vertices are the welded boundary vertices of neighbouring faces, which lie on straight chords of this face's boundary, not on its surface. Every vertex that isn't one of those sits on the joined surface at 1e-10 m. The evaluator, join, radius, unit and staleness candidates all fail to explain it. The mesh is chordal at its boundary only.

## What was compared

Closed-form distance from each display vertex to the infinite cylinder (|rad - r|) or cone (|(rad - r) cos(a) - h sin(a)|), using the joined face's stored `p`, `a`, `r`, `angle`. Join by `metadata.rawId` = native face id. Vertices are metres. Bar: 1e-9 m for "on the surface" (float32 vertices give 1e-10 at these radii). Parts: 8cd79ff5, a4ecc6f5, 2f121983. Scripts in `scripts/EXP105/`.

## Results

Per-face numbers (radius, mean, max, mean/r, max/r) are in `out_<part>.json`. Worst faces:

| part | face | type | r (m) | mean (m) | max (m) | mean/r |
|---|---|---|---|---|---|---|
| 8cd79ff5 | 1462 | cyl | 3.24e-3 | 3.15e-6 | 1.10e-5 | 9.7e-4 |
| 8cd79ff5 | 1015 | cone | 2.30e-3 | 1.40e-6 | 4.8e-6 | 6.1e-4 |
| a4ecc6f5 | 10802 | cyl | 8.13e-2 | 7.77e-5 | 2.45e-4 | 9.6e-4 |
| a4ecc6f5 | 34199 | cyl | 1.43e-2 | 6.34e-5 | 2.43e-4 | 4.4e-3 |
| 2f121983 | 66 | cyl | 1.90e-2 | 6.31e-6 | 4.24e-5 | 3.3e-4 |
| 2f121983 | 695 | cone | 1.90e-2 | 6.64e-6 | 3.00e-5 | 3.5e-4 |

Split by vertex (`sweep.js`, `sweep2.js`, `neighbor.js`; joined, non-duplicate faces only):

| part | verts | on surface (<1e-9 m) | max of those | off | off on a chord of two other face vertices | off equal to a vertex of another display face |
|---|---|---|---|---|---|---|
| 8cd79ff5 | 2419 | 1800 | 3.6e-10 | 619 | 619 | 619 of 619 |
| a4ecc6f5 | 4586 | 2248 | 9.6e-10 | 2338 | 1439 | 2598 of 2598 (all faces, see below) |
| 2f121983 | 3403 | 2416 | 9.8e-10 | 987 | 814 | 1057 of 1057 (all faces) |

So 60 to 100% of off vertices are exactly collinear (<1e-9 m) with two other vertices of the same face. In 8cd79ff5 the off ones are in pairs with the same angle on both rim rings, all inward (negative), 1e-5 m at r = 3.24 mm. The sag fits a chord, not a wrong radius.

## Candidates

- Wrong radius field, diameter, cone origin vs apex, unit or scale: ruled out. Interior vertices of the same faces give 1e-10 m with the same fields (onMax above). A wrong radius would move every vertex. Same for a body transform.
- Wrong join: partly real, separate effect. a4ecc6f5 has display faces with the same rawId (2 twice, 228, 31) and 4 rawIds with no native face (123, 144, 207, 291). Face 2 joined to the wrong display face gives mean 9.3e-3 m (101% of r). These were left out of the table. Wrong joins don't explain the 1e-6 to 3e-4 m cases: 8cd79ff5 and 2f121983 have no unjoined faces and one duplicate (253) at most.
- Stale mesh: ruled out. ModelStamps counter vs DLUpdateStamp: 8cd79ff5 129 vs 128 (one behind), a4ecc6f5 128 vs 128, 2f121983 4165 vs 4165, control C13 106 vs 106 (`stamps_out.txt`). a4ecc6f5 and 2f121983 are current and still show the offset. 8cd79ff5 is one change behind, and its off vertices are still all explained by chords.
- Genuinely chordal mesh: holds, at the boundary. Triangle centroids are 1e-5 m off as expected for chords (`cenMax`), but vertices are the point: the off ones are welded vertices from the neighbour's edge discretisation, inserted on this face's straight boundary segment.

## Control

- C13_cone (SW2022): 1 cone, 144 vertices, max 1.8e-10 m, no off vertices. It has no neighbouring curved-edge faces to weld to.
- C04 hole (70 vertices) and C19 half cylinder (56): 0 off, max 2.2e-10 m.
- C20 crossed cylinders: 716 on, 20 off up to 9.0e-6 m, all 20 on chords and all 20 equal to a vertex of another face.
- C21 cylinder fillet: 190 on, 66 off up to 5.3e-6 m, 66 of 66 on chords and shared.

So the control reproduces both the 1e-10 m result and the off vertices. This matches EXP-097 (boundary vertices up to 6.9e-4 m off, interior 180 of 42,630). It is also why EXP-091 saw 1e-9: its controls were single faces with no welded neighbour.

## Planes and spheres

Not rechecked here. A plane contains its chords, so welded vertices on a straight boundary are still on it. That fits the 1e-9 m on planes. Spheres: untested explanation, guess only.

## Not checked

- 899 of 2338 off vertices in a4ecc6f5 and 173 of 987 in 2f121983 are on no chord of two vertices of their own face. They all coincide with another face's vertex, so welding explains where they come from, but I haven't shown where the chord is. Possible: chord endpoints that belong to neighbours only. Not tested.
- Which face's edge discretisation each vertex comes from, and whether it lies on the native edge curve.
- Whether "on surface" must use a looser bar than 1e-9 m: some unexplained vertices sit at 1.4e-9 m (face 4084, 2f121983), just over it.
- The duplicate rawIds in a4ecc6f5 (cause: not examined, perhaps multiple bodies).
- No blind prove/disprove agents were run.
- Consequence for the converter: exact surface checks should skip boundary vertices, or judge them against the edge curve.

## Scripts

This folder: `measure.js` (per-face distance), `pervertex.js`, `chord.js`, `sweep.js`/`sweep2.js` (on/off split, chord test), `neighbor.js`, `unexplained.js`, `stamps.js`. Outputs: `out_*.json`, `sweep*_*.json`, `neighbor_out.txt`, `stamps_out.txt`.
