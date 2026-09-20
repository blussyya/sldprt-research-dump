# converter/v0.1 — SLDPRT → STL / STEP

First conversion pass. Consumes `parser/v0.2` output and writes STL and STEP.

```bash
node converter/v0.1/src/node-cli.js <model.SLDPRT> [--stl out.stl] [--step out.step]
                                    [--ascii] [--faceted] [--scale N]
```

With neither `--stl` nor `--step`, both are written next to the input. `--ascii` selects
ASCII STL (binary is the default). `--faceted` disables analytic plane emission and writes
every face as triangles.

Validate against the controlled corpus:

```bash
node converter/v0.1/test/validate.js      # exits nonzero on any structural failure
```

## What it actually produces

**STL is an exact dump of the display mesh.** Every triangle `parser/v0.2` emits, nothing
welded, re-ordered or repaired.

**STEP is a boundary representation, partly analytic.** Faces tagged 4001 (plane) with usable
INV-024 boundary cycles are written as real `PLANE` surfaces trimmed by their cycles; every
other face falls back to per-triangle facets. Vertices and edges are shared across the whole
body, so the result is one connected shell rather than a triangle soup. A closed mesh becomes
`MANIFOLD_SOLID_BREP`; an open one becomes `SHELL_BASED_SURFACE_MODEL`.

## Validation (EXP-053)

13 controlled models. Full per-model numbers in `VALIDATION.json`.

| | result |
|---|---|
| STEP files with dangling references | **0 / 13** |
| Meshes closed by our export | **13 / 13** |
| Bounding box delta vs SolidWorks STL | **0 on all 13** |
| STL exactly equal to SolidWorks' export | 4 (C00, C01, C02, C10) |
| STL a strict superset of it | 1 (C09) |
| STL re-tessellated | 8 |

Volumes, computed independently by the divergence theorem:

| model | ours | SolidWorks STL | note |
|---|---|---|---|
| C00 cube 10 mm | 1000.000000 | 1000.000000 | exact |
| C01 cube 20 mm | 8000.000000 | 8000.000000 | exact |
| C10 shell 1 mm | 424.000000 | 424.000000 | exact |
| C09 chamfer 1 mm | 995.000000 | 995.000000 | exact |
| C04 hole 5 mm | 804.766141 | 804.498746 | 3.3e-4 relative |
| C07 two holes | 609.532280 | 608.997499 | 8.8e-4 relative |

The planar models reproduce their analytic volumes exactly. Curved models differ by under
0.09%, which is tessellation density: SolidWorks re-tessellates when exporting STL, so its
STL and the stored display mesh are two different meshes of the same solid. C03's fillet, for
instance, is 8 angular steps in the STL export and 4 in the display mesh.

**C09, C03 and C11's STL exports are missing a face.** Our export has 4 fewer open edges than
SolidWorks' own on those three models, and for C09 the sole difference is the `-1,0,0` facet
group: 0 triangles in the reference, 2 in ours. This independently reproduces EXP-049's
finding from a different direction, and it means "mismatch" there is the reference being
incomplete, not the converter.

## Scope and limits

Read these before treating output as a CAD deliverable.

- **The source is the display mesh, not the B-rep.** Curved faces are exported as facets
  because the exact trimming curves are not recovered. EXP-050 established that display
  vertices on a cone sit *inside* it, on chords between on-surface points — the mesh
  approximates the surface, so a faceted region cannot be un-faceted by re-fitting.
- **Coordinates are float32.** A 10 mm cube round-trips as 9.9999998 mm. That is the stored
  precision, not a conversion error, and it bounds every tolerance here.
- **Surface metadata is not yet used for curved output.** Cylinders and cones carry full
  analytic parameters (axis point, direction, radius — validated against STEP in EXP-045/048),
  so `CYLINDRICAL_SURFACE` and `CONICAL_SURFACE` emission is the obvious v0.2 step. It needs
  exact circular trim curves, which the polygonal boundary cycles do not provide.
- **Not a feature-history converter.** No sketches, features, constraints, materials,
  configurations or assembly structure. Geometry only.
- **Legacy OLE2 parts are unsupported**, as with the parser.
- Faces tagged 4005/4006/4007/4009 have no external validation at all (NQ-030); they are
  faceted like any other non-plane.
