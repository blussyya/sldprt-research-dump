# Controlled corpus extension — build spec for C13–C26

Target for an automation agent driving SolidWorks. Continues the conventions of the existing
C00–C12 corpus (see `README.md`): millimetres, origin-anchored, **one controlled variable per
model**, verified by mass properties at build time.

The value of C00–C12 is that each file differs from a neighbour in exactly one way. Please keep
that. A model with two new things in it has two possible causes for any surprise in the output,
and stops being evidence.

---

## Global conventions (apply to every model below)

- **Units** mm, document template default, MMGS.
- **Baseline cube** where mentioned: 10×10×10 mm occupying [0,10]³, one corner at the origin.
  Identical to C00.
- **No** materials, appearances, colours, custom properties, or renamed features. Defaults only.
- **One body**, one configuration, no derived configurations.
- Directory per model: `C##_short_name/`
- Each directory contains **all** of:

  | file | why |
  |---|---|
  | `model.SLDPRT` | the subject |
  | `model.step` | **ground truth** — gives the true surface type per face |
  | `model.STL` | mesh cross-check |
  | `model.x_t` | Parasolid **text** transmit, see note below |

- `model.x_t` must be the **text** flavour (`.x_t`), not binary `.x_b`. This is the highest-value
  new export: it is an authoritative decode of the same B-rep we are currently staring at as
  opaque binary inside the part file. Save As → Parasolid (\*.x_t).
- Record the mass-properties volume for each model and compare to the expected figure in the
  tables. A mismatch means the model is not what the spec describes — report it, don't adjust
  the spec to match.

---

## Set A — surface-type identification (C13–C18)

**Purpose.** Our parser reads a numeric surface tag per face. We have 4001 = plane and
4002 = cylinder validated against the controlled corpus. 4003 = cone is asserted but has
**never** been confirmed against a controlled model. Tags 4005, 4006, 4007 and 4009 are
completely unidentified. No other project in the field has documented these at all.

Each model below is a bare primitive — one surface type, minimum face count, nothing else — so
that a tag appearing in the output can only have come from one place.

### C13 — cone

Revolve. Sketch on the Front plane: a right triangle with vertices (0,0), (5,0), (0,10), the
vertical leg lying on the Y axis. Revolve 360° about the Y axis.

Result: 2 faces — one conical, one planar base. Base radius 5, height 10.

**Expected volume 261.799 mm³.**

### C14 — sphere

Revolve. Sketch on the Front plane: a semicircle of radius 5 centred on the origin, flat side on
the Y axis, closed with a line along the axis. Revolve 360° about the Y axis.

Result: 1 spherical face (SolidWorks may split it at the seam — if the face count is 2, note it
in the build log, it does not invalidate the model).

**Expected volume 523.599 mm³.**

### C15 — torus

Revolve. Sketch on the Front plane: a circle of radius **2** centred at (5, 0). Revolve 360°
about the Y axis.

Result: 1 toroidal face. Major radius 5, minor radius 2.

**Expected volume 394.784 mm³.**

### C16 — lofted spline surface

Loft between two **dissimilar** profiles, to force a genuine B-spline / NURBS surface rather
than an analytic one.

- Sketch 1, on the Top plane (y=0): a square, 10×10, centred on the origin.
- Sketch 2, on a plane offset 10 mm above the Top plane: a **circle** of radius 4, centred on
  the origin.
- Loft between them, no guide curves, no centreline.

Result: a solid whose side faces are spline surfaces, with a planar square bottom and planar
circular top.

**Expected volume: no closed form — record from mass properties.** Do not invent a number.

### C17 — quarter torus (trimmed, same surface type as C15)

Revolve, identical sketch to C15 (circle radius 2 centred at (5,0) on the Front plane), but
revolve **90°** instead of 360°.

Result: a toroidal face trimmed to a quarter, plus two planar end caps.

This is the contrast partner for C15: same surface type, trimmed vs complete. It tells us
whether the tag encodes the surface or the trimmed patch.

**Expected volume 98.696 mm³.**

### C18 — split line on a planar face

Baseline 10×10×10 cube. Sketch a single straight line on the top face (z=10) running from
(0,5,10) to (10,5,10). Insert → Curve → Split Line, projecting that sketch onto the top face.

Result: geometrically identical to C00 — **volume unchanged at 1000 mm³** — but the top face is
now two faces instead of one.

This separates "new face" from "new geometry". Any output difference against C00 is caused by
face subdivision alone.

---

## Set B — cylinder trimming (C19–C21)

**Purpose.** We measured 1,518 of 9,669 cylindrical-face boundary vertices deviating from the
stored radius, worst case 0.12 mm — far beyond float32 noise. The controlled corpus never
exposed this because its holes are all simple full-circle through-holes. These three separate
the candidate explanations.

### C19 — half cylinder

Extrude. Sketch on the Top plane: a semicircle of radius 5 centred on the origin, closed across
the diameter with a line. Extrude 10 mm.

Result: one cylindrical face trimmed to 180°, two planar ends, one planar flat.

Tests: **does a partial cylinder's boundary stop being a circle?**

**Expected volume 392.699 mm³.**

### C20 — two intersecting cylinders

Two cylinders of radius 5, length 20, axes perpendicular and **intersecting at a common centre
point** (a Steinmetz configuration). Build as two extrudes, merged into one body.

- Cylinder 1: sketch circle r=5 on the Front plane centred at origin, extrude 20 mm mid-plane.
- Cylinder 2: sketch circle r=5 on the Right plane centred at origin, extrude 20 mm mid-plane.

Result: each cylindrical face is trimmed by a **non-planar** intersection curve.

Tests: **do non-planar trim boundaries account for the deviation?**

**Expected volume 2474.926 mm³** (2 × 1570.796 cylinder − 666.667 bicylinder intersection).
Verify this one carefully; if the agent's construction merges differently the number will move.

### C21 — cylinder meeting a fillet

Sketch circle r=5 on the Top plane centred at origin, extrude 10 mm. Then apply a 1 mm fillet to
the **top circular edge only**.

Result: cylindrical face whose upper boundary is tangent to a toroidal fillet face rather than
meeting a plane.

Tests: **does a tangent-continuous neighbour shift the boundary vertices?**

Base cylinder before fillet is 785.398 mm³; record the post-fillet figure from mass properties.

---

## Set C — version matrix (C22–C26)

**Purpose.** The container declares a DisplayLists format version that our parser has never
read. Our corpus spans `_DL_VERSION_13000` through `17000` and the parser has been validated
across all five without consulting the declaration — correct by accident. A 2011-era file also
lets us test whether legacy OLE2 uses the same record grammar or a genuinely different one.

**Geometry must be identical across this whole set.** The only variable is the writing
application. Use the C00 baseline cube — 10×10×10 at [0,10]³ — and nothing else.

| ID | directory | built in | saved as | notes |
|---|---|---|---|---|
| C22 | `C22_cube_sw2011_native` | SolidWorks 2011 | 2011 native | expect legacy OLE2 container |
| C23 | `C23_cube_sw2011_to_2022` | open C22 in 2022 | 2022 native | upgrade path |
| C24 | `C24_cube_sw2022_native` | SolidWorks 2022 | 2022 native | should match C00 byte-for-byte in geometry, though not in full |
| C25 | `C25_cone_sw2011_native` | SolidWorks 2011 | 2011 native | C13 geometry, legacy container |
| C26 | `C26_cube_hole_sw2011_native` | SolidWorks 2011 | 2011 native | C04 geometry, legacy container |

All five still need the four-file export set. For the 2011 models, if `.x_t` export is
unavailable in that version, note it and skip that file only.

C25 and C26 matter because they carry a curved face and a cylindrical hole into the legacy
format — a legacy cube alone would not tell us whether legacy DisplayLists encodes curved
surface tags the same way.

---

## Build log

Please emit `BUILD_LOG.md` in the `controlled/` directory recording, per model: the SolidWorks
version and build number, the mass-properties volume, the face count, the surface type of each
face as SolidWorks reports it, and any deviation from this spec. The face-type list is what
turns these files into ground truth — without it we are back to inferring.

If a model cannot be built as described, **say so and leave it out** rather than substituting
something similar. A file that is not what the spec says it is will be worse than no file,
because it will be trusted.
