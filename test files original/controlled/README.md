# Controlled Test Corpus

Controlled, machine-generated SolidWorks 2022 models designed to exercise exactly one
parametric change at a time. Each model is a 10×10×10 mm cube (origin at (0,0,0), one
corner at the origin, volume 1000 mm³) plus a single controlled feature, so the corpus
supports one-variable-at-a-time comparisons of how SLDPRT/STEP/STL encodings react to
specific geometry changes.

All models were built in SolidWorks 2022 (rev 30.1.0) via COM automation and verified by
mass properties at build time. Each directory contains three exports of the same geometry:
`model.sldprt` (native), `model.step`, and `model.stl`.

## Model table

| ID | Directory | Description | Expected volume (mm³) | Verified |
|----|-----------|-------------|------------------------|----------|
| C00 | `C00_cube_10mm` | Baseline 10×10×10 cube | 1000 | ✓ |
| C01 | `C01_cube_20mm` | Cube scaled to 20×20×20 | 8000 | ✓ |
| C02 | `C02_cube_translated` | 10×10×10 cube translated to (50,50,0) | 1000 | ✓ |
| C03 | `C03_cube_fillet_1mm` | Baseline + 1 mm fillet on exactly ONE edge | 997.854 | ✓ |
| C04 | `C04_cube_hole_5mm` | Baseline + 5 mm Ø through-hole at center | 803.651 | ✓ |
| C05 | `C05_cube_hole_3mm` | Baseline + 3 mm Ø through-hole at center | 929.314 | ✓ |
| C06 | `C06_cube_hole_moved` | C04 geometry with hole moved only (center → (7,5)) | 803.651 | ✓ |
| C07 | `C07_cube_two_holes` | Baseline + two identical 5 mm Ø through-holes | 607.301 | ✓ |
| C08 | `C08_cube_second_hole_modified` | C07 geometry with only the second hole modified (5 → 3 mm) | 732.965 | ✓ |
| C09 | `C09_cube_chamfer_1mm` | Baseline + 1 mm × 45° chamfer on exactly ONE edge | 995.000 | ✓ |
| C10 | `C10_cube_shell_1mm` | Baseline + 1 mm shell with top face removed | 424.000 | ✓ |
| C11 | `C11_cube_hole_4mm` | Baseline + 4 mm Ø through-hole at center | 874.336 | ✓ |
| C12 | `C12_cube_fillet_1mm_edge2` | Baseline + 1 mm fillet on exactly ONE edge, the edge opposite C03/C09's (corner (0,0) instead of (10,10)) | 997.854 | ✓ |

## Pairwise comparisons (one variable at a time)

| Pair | Purpose |
|------|---------|
| C00 ↔ C01 | Global scale change only (all dimensions ×2) |
| C00 ↔ C02 | Position/translation change only (same shape) |
| C00 ↔ C03 | Local edge treatment: fillet vs sharp edge |
| C03 ↔ C12 | Fillet on the SAME edge geometry but opposite corner (COM mirrors across the cube center) |
| C00 ↔ C04 | Through-hole addition, center of top face |
| C04 ↔ C05 | Hole diameter change only (5 → 3 mm) |
| C04 ↔ C11 | Hole diameter change only (5 → 4 mm) |
| C05 ↔ C11 | Hole diameter change only (3 → 4 mm) |
| C04 ↔ C06 | Hole position change only (same diameter) |
| C04 ↔ C07 | Single hole → two identical holes |
| C07 ↔ C08 | Second hole's diameter changed only |
| C00 ↔ C09 | Local edge treatment: chamfer vs sharp edge |
| C03 ↔ C09 | Fillet vs chamfer on the SAME edge |
| C00 ↔ C10 | Shell (hollowed solid with one open face) vs solid |

## Coordinate conventions

- Cube occupies [0,10]³, so the "front" face (normal +Z) is the z=10 plane.
- C03 fillet and C09 chamfer are applied to the SAME edge: the edge along +Z at (x=10, y=10),
  selected by point (10,10,5).
- C12 fillet is applied to the OPPOSITE corresponding edge: the edge along +Z at (x=0, y=0),
  affecting the x=0 and y=0 faces (vs. the x=10 and y=10 faces for C03/C09). Selected by
  body-edge enumeration to guarantee the exact edge.
- C10 shell removes the top face (z=10), selected by point (5,5,10); wall thickness 1 mm.
- C04 hole center (5,5); C05 same center, smaller radius; C11 same center, 4 mm Ø; C06 center moved to (7,5).
- C07 holes centered at (3,3) and (7,7) — fully interior and non-overlapping for two 5 mm Ø holes.

## Verification method

Each model's volume was checked against the analytic expectation at build time
(mass properties from `IModelDocExtension::CreateMassProperty`, tolerance ±0.5 mm³).
Volume results above are the measured values. Center-of-mass was also checked to confirm
the intended asymmetry where applicable (e.g. C06 shifted toward the off-center hole,
C08 toward the smaller hole, C10 lowered by the opened top face).

## Generation notes

- Built with SolidWorks 2022 COM automation; sketch-based construction on the Front Plane,
  Boss-Extrude for the cube, through-all Extruded Cut for holes, FeatureFillet3 (constant
  radius, Options=195 with empty VARIANT arrays) for C03, InsertFeatureChamfer (distance-angle)
  for C09, InsertFeatureShell for C10.
- Exports: native SLDPRT via SaveAs3; STEP (AP203) and STL via the corresponding
  save-as path (extension selects the exporter).