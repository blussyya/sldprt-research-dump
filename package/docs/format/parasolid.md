# The Parasolid body: exact geometry

SolidWorks is built on the Parasolid kernel, and every part stores its solid as a Parasolid
transmit file inside the SLDPRT. That body has the exact geometry: analytic planes, cylinders,
cones, spheres and tori, B-spline surfaces and curves with their control points and knots, and
the full face–loop–edge–vertex topology. It is stored in a framed, zlib-compressed stream
(`Config-0-Partition`).

The transmit format itself is documented by its owner: the *Parasolid XT Format Reference*
(UGS, October 2006), written, in its own words, for people writing translators to and from the
format. The SolidWorks wrapping around it is not documented anywhere and was worked out here.

Readers: [`src/parasolid/partition.js`](../../src/parasolid/partition.js) (streams, sections,
body selection), [`src/parasolid/xt.js`](../../src/parasolid/xt.js) (the transmit reader, also
reads standalone `.x_t` / `.x_b`), [`src/parasolid/topology.js`](../../src/parasolid/topology.js)
(graph checks). Node.js only.

```sh
sldprt brep part.SLDPRT            # census and graph checks
sldprt brep part.SLDPRT --nodes    # every typed node as JSON
```

---

## Partition streams

### Section frame

Every partition-bearing stream is a chain of sections:

```
u32le size                          size = compressed + 32
16-byte GUID 231dd571-da81-48a2-a858-98b21b89ef99
u32le inflated length
u32le compressed length
zlib member                         compressed bytes
8 zero bytes
```

| stream | sections | chained exactly to the end of the stream |
|---|---|---|
| `Config-N-Partition` | `TRANSMIT FILE (partition)`, then `TRANSMIT FILE (deltas)` | 70/70 |
| `Config-N-GhostPartition` | one `(partition)` | 65/65 |
| `Config-0-FeatureBodies/LocalBodies` | one plain `TRANSMIT FILE`, after a 64-byte prefix | 1 file |
| `Config-N-ResolvedFeatures` | plain one-face PLANE bodies, 36 sections in 14 files | |

All 242 sections end in eight zero bytes
([EXP-074](https://github.com/blussyya/sldprt-research-dump/blob/main/knowledge/evidence/2026-09-29_v0.4.9-EXP074.md)).
The same GUID-and-lengths frame, without the size word, wraps the legacy `DisplayLists__ZLB`
stream ([container.md](container.md#the-compressed-stream-wrapper)).

The `(deltas)` section, the ghost partition and the ResolvedFeatures bodies are read as sections
but their role is not established (see [open questions](../open-questions.md)).

### Which body is the part

The reader takes the first section of `Config-0-Partition`. If that body has no faces, it takes
the first section with faces from any other stream that carries the GUID.

In the corpus that rule is needed once. PTC GE8080-8's primary partition holds only a WORLD node,
and its 126-face body is an imported body in `Config-0-FeatureBodies/LocalBodies`. With it, the
native face count equals the display face count on all 21 original modern parts and all 49
controlled parts. This is what the corpus supports. It is not a model of configurations or
rollback states.

---

## The transmit format

The reader handles both encodings of the same content: **text** (`.x_t`) and **neutral binary**
(`.x_b`, and every embedded partition). Binary is big-endian.

### Header

Binary: `PS 00 00`, then

| field | type |
|---|---|
| description length, description (`: TRANSMIT FILE (partition) created by modeller version 3301247`) | u16 + bytes |
| schema name length, schema name (`SCH_3301247_33103_13006`) | u32 + bytes |
| maximum number of node types | u16 |
| user field size; must be 0 | u32 |

A standalone `.x_b` first has an ASCII banner ending `**END_OF_HEADER` and a newline. Text files
have the same banner, then `T` and the same fields as text tokens.

Every file in the corpus uses base schema **13006**, under five modeller versions:

| schema | files (21 original modern) |
|---|---|
| `SCH_3301247_33103_13006` | 15 |
| `SCH_3501251_35102_13006` | 2 |
| `SCH_3101290_31100_13006` | 2 |
| `SCH_3401247_34101_13006` | 1 |
| `SCH_3201230_32001_13006` | 1 |

The reader refuses any other base schema.

### Older transmit files

Two older forms occur in the pre-2011 parts ([EXP-077](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-03_v0.5-EXP077.md)):

**Written in schema 13006 itself** (chainwheel, `SCH_1300242_13006`, Parasolid 13.0). The schema
name has two numbers instead of three, the node-type count is absent from the header, and no type
carries schema data before its first node: every layout is the base one. One difference shows up:
LIST has twelve fields here, the nine that later edit scripts copy plus `current_block` (pointer),
`current_position` (int) and `finished` (logical). The names follow the XT reference; the layout
is confirmed by the file parsing to its last byte.

**Bare binary, Parasolid 9** (plate4, `SCH_900203_9008`). `B` instead of `PS 00 00`, the
description length as an int32, and every number little-endian. Schema 9008 differs from 13006 in
five node types:

| type | difference from 13006 |
|---|---|
| BODY | no `nom_geom_state` |
| FIN | no `attributes_groups` field at the front |
| ATTRIB_DEF | no `field_names` pointer; 13 legal-owner flags instead of 14 |
| LIST | the twelve-field layout above |
| KEY (102) | a variable-length string, not in the 13006 table |

Both files parse to the terminator with every byte consumed and no graph-check failures (13,527
checks for chainwheel, 900 for plate4).

### Schema edits

The file does not repeat the field layout of every node type. The first time a node type
appears, it is preceded by a description of how that type's fields differ from the base schema:

- `u8` = 255: identical to the base.
- otherwise `u8` = number of fields, then an edit script over the base fields: `C` copy, `D`
  delete, `I` insert a new field, `A` append a new field, terminated by `Z`.
- A type with no base layout carries a full declaration: name, description and every field
  descriptor.

A field descriptor is: name (short string), `ptr_class` (i16), element count (pointer-encoded:
0 means one, 1 means variable-length, otherwise fixed), the type letter only when `ptr_class` is
0, and a transmit flag for variable-length fields.

This is how the same reader handles SolidWorks 2011 and 2022 files: the 2022 BODY carries three
more pointer fields than the 2011 one, and the edit script says so.

### Nodes

```
u16 node type
[i32 element count]      only for types with a variable-length field
pointer node index       unique, positive
fields                   in schema order
```

The stream ends with node type `1` and index `0`. The reader requires the terminator, rejects
trailing bytes and duplicate indices, and stops (with the position) at anything it cannot
describe. It never scans forward for a marker.

### Values

| letter | binary encoding |
|---|---|
| `u` unsigned byte, `c` char, `l` logical | 1 byte |
| `n` short, `w` unicode unit | i16 |
| `d` integer | i32 |
| `f` double | IEEE binary64 |
| `v` vector, `i` interval, `h` hvec, `b` box | 3, 2, 3, 6 doubles |
| `p` pointer | see below |

**Nulls.** The integer −32764 and the double −3.14158e13 are null (`?` in text).

**Pointers.** A signed i16 `r`. If `r > 0` the index is `r − 1`, so null is encoded as `0001`.
If `r < 0`, a second positive i16 `q` follows and the index is `q·32767 − r − 1`. A pointer word
can legitimately equal the integer null sentinel, so pointers are never passed through null
conversion.

Text files write logicals as `T`/`F`, and `c` and `l` fields are not followed by a space.

---

## What is in a body

| type | node | key fields |
|---|---|---|
| 101 | WORLD | root of a partition; `body`, `highest_id`, `current_id` |
| 12 | BODY | `highest_node_id`, `res_size` (1000), `res_linear` (1e-8), `body_type`, `shell`, `region` |
| 19 | REGION | `shell`, `type` (one solid region, one void) |
| 13 | SHELL | `face`, `edge`, `vertex` |
| 14 | FACE | `surface`, `sense`, `loop`, `tolerance`, `node_id` |
| 15 | LOOP | `face`, `fin`, `next` (further loops = holes) |
| 17 | FIN | half-edge: `loop`, `forward`, `backward`, `other`, `edge`, `vertex`, `sense` |
| 16 | EDGE | `fin`, `curve`, `tolerance`, `node_id` |
| 18 | VERTEX | `point`, `tolerance` |
| 29 | POINT | `pvec` |
| 50 | PLANE | `pvec`, `normal`, `x_axis` |
| 51 | CYLINDER | `pvec`, `axis`, `radius`, `x_axis` |
| 52 | CONE | `pvec`, `axis`, `radius`, `sin_half_angle`, `cos_half_angle`, `x_axis` |
| 53 | SPHERE | `centre`, `radius`, `axis`, `x_axis` |
| 54 | TORUS | `centre`, `axis`, `major_radius`, `minor_radius`, `x_axis` |
| 124 / 126 | B_SURFACE / NURBS_SURF | degrees, vertex counts, knot types, `rational`, periodic/closed flags, control points, knot multiplicities, knots |
| 134 / 136 | B_CURVE / NURBS_CURVE | the same for curves |
| 30, 31, 32 | LINE, CIRCLE, ELLIPSE | |
| 133 | TRIMMED_CURVE | `basis_curve`, end points and parameters |
| 137 | SP_CURVE | a curve in a surface's parameter space |
| 38, 40, 41 | INTERSECTION, CHART, LIMIT | intersection curves, kept as their defining data |
| 56, 59 | BLENDED_EDGE, BLEND_BOUND | rolling-ball blends |
| 67 | SWEPT_SURF | `section`, `sweep`, `scale` |
| 70, 74, 79–84, 98 | LIST, POINTER_LIS_BLOCK, attributes and value arrays | |

Every surface and curve shares the common geometry fields (`node_id`, `owner`, `next`,
`previous`, `geometric_owner`, `sense`). Coordinates are in **metres**. The surface is oriented
by `surface.sense × face.sense`.

Where the corpus disagrees with the 2006 reference, the reader follows the corpus, and each
point is backed by complete parses
([EXP-071](https://github.com/blussyya/sldprt-research-dump/blob/main/knowledge/evidence/2026-09-29_v0.4.9-EXP071.md)):

- BODY includes `nom_geom_state`. The reference's field table has it; its C struct omits it.
- EDGE has one attributes pointer. The C struct repeats it.
- ELLIPSE has the common `sense` field. The C struct omits it.
- LIST's base fields are a nine-field reconstruction from the embedded edit scripts. It is
  corroborated by full traversal on every file, but no independent schema file was available.

---

## How well it reads

| set | result |
|---|---|
| 49 controlled models, `.x_t` and `.x_b` exports (98 files) | every file parses to its terminator; 28,428 graph checks, 0 failures; face counts equal SolidWorks' own |
| the same 49 models' embedded partitions | 8,209 nodes, 287 faces, 14,262 graph checks, 0 failures; face counts equal the exports' |
| 21 original modern parts | 43,158 nodes, 1,272 faces, 0 graph failures |
| C00 cube, both eras | 6 planes, 12 edges, 8 vertices, Euler characteristic 2, outward loops, corners exactly at 0 and 0.01 m, volume exactly 1e-6 m³ |

The graph checks cover face and loop ownership, closed fin rings, reciprocal forward and backward
fins, two-fin edges with opposite senses, vertex points, and B-spline control-point and knot array
sizes with increasing knots. All of this is re-run by `test/parasolid.test.js`.

**Text and binary exports differ only in IDs.** The `.x_t` and `.x_b` of a model are two separate
exports. Across all 49 pairs they differ only in 24 `BODY.highest_node_id` values and 308
attribute node IDs, plus floating-point noise up to 1.1e-13. No FACE ID differs.

**Against SolidWorks' STEP export.** On all 49 controlled models, the body decoded from the
SLDPRT matches the `model.step` SolidWorks exported from the same part, face for face, edge for
edge and vertex for vertex. The worst deviation is 9e-18 m, which is double-precision rounding of
the same numbers printed in millimetres. The checks are:

- every native vertex is a STEP vertex;
- every STEP edge lies on exactly one native edge's curve, inside its extent;
- the STEP pieces of each native edge add up to its exact length;
- every STEP face lies on one native face's surface, on the same side;
- every edge's two faces correspond.

The only differences are seams. STEP splits closed faces (cylinders, cones, spheres, tori) into
pieces along seam edges: 287 native faces become 331 STEP faces through 90 seams. Even the B-spline
loft surfaces have identical control points and knots. Twenty mutations, each 1e-7 m or less and
including four wrong-model pairings, are all detected, so the agreement is not an artifact of a
loose test
([EXP-075](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-03_v0.5-EXP075.md),
`test/brep-step.test.js`).

**Native vs exported.** Compared graph-to-graph from the BODY down, the embedded body equals the
exported one on 47 of 49 models. The two lofts (C16, both eras) differ: native `nom_geom_state` is
2 against the export's 1, and several curve references and types differ
([EXP-072](https://github.com/blussyya/sldprt-research-dump/blob/main/knowledge/evidence/2026-09-29_v0.4.9-EXP072.md)).

## The production-only geometry

Four kinds of geometry occur in the real parts and in none of the controlled models. Where each is
stored was found in [EXP-077](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-03_v0.5-EXP077.md); how each is evaluated and written is
[EXP-078](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-04_v0.5-EXP078.md). None has a SolidWorks STEP to compare against, so each is checked against the
display mesh and against OpenCascade instead.

### INTERSECTION curves

The curve where two surfaces meet (node type 38). The node holds:

- `surface[2]`: the two surfaces;
- `chart`: a CHART node (type 40) with `chart_count` points (`hvec[]`, 3 doubles each) along the
  curve, and the errors they were made to: `chordal_error`, `angular_error`, `parameter_error[2]`;
- `start`, `end`: LIMIT nodes (type 41). Type `L` ends an open curve; type `H` (start = end)
  marks a closed one.

Every chart point lies on **both** surfaces to 3e-15 m (2,170 points on 392 curves), so the
chart is a list of exact points on the true curve. They are far apart, though: the chords
between them stray up to 2.5 mm. Each INTERSECTION belongs to exactly one edge, and its chart runs
a little past the edge's vertices.

`src/brep/intersection.js` computes the curve. It walks the chart from the edge's start vertex to
its end (once round, for a ring), puts every sample exactly on both surfaces with Newton's method
(the two surface distances plus a plane across the walk), takes the tangent as the cross product
of the two normals, and joins the points with cubic Hermite pieces. A piece is split while its
middle is more than 1e-9 m from the true curve. The result is a cubic B-spline. Sampled densely and
independently, the 148 curves in distributor, USB hub BOTTOM and chainwheel stay within 9.3e-10 m
of both faces.

### Tolerant edges

The EDGE has `curve` null and a nonzero `tolerance` (5e-7 m in Dekor, 1e-5 m in USB hub TOP).
Each of its two FINs carries its own curve instead:

```
FIN.curve → TRIMMED_CURVE (point_1, point_2, parm_1, parm_2)
          → SP_CURVE (surface, b_curve)
          → B_CURVE → NURBS_CURVE, 2D (u,v) control points in that surface's parameters
```

So the edge exists twice, once drawn on each face it separates. Evaluated through its surface,
each fin curve hits the stored trim points to 1e-16 m (54 of 54). The two copies stay within the
edge's tolerance of each other on 27 of 27 edges (0.21 µm apart at worst in Dekor, 1.76 µm in USB
TOP). That also confirms Parasolid's (u,v) parametrisation of planes, cylinders, tori and B-spline
surfaces. The writer uses the positive fin's copy, mapped through its surface and fitted the same
way as an intersection curve, to 1e-9 m.

### Swept surfaces (SWEPT_SURF)

`section` (a curve), `sweep` (a vector) and `scale`. All 311 in Dekor are a rational cubic section
translated along +z: a **linear extrusion**. `scale` only stretches the sweep parameter, so it
doesn't change the surface. STEP has the same thing, `SURFACE_OF_LINEAR_EXTRUSION`, so these are
written exactly. The natural normal is section tangent × sweep: the outward normals this gives agree
with the display mesh normals on 311 of 311 faces.

Rational B-spline control points are stored **homogeneous**: (x·w, y·w, z·w, w). Dekor's
sections show it, since dividing by w puts every control point of a planar section at the same z.

### Rolling-ball blends (BLENDED_EDGE)

| field | meaning |
|---|---|
| `surface[2]` | the two supports the ball touches |
| `spine` | the curve of ball centres: an ELLIPSE (Pocket Wheel), a CIRCLE, or an INTERSECTION of the two supports offset by the radius |
| `range[2]` | signed offset of each support to the spine, along the support's normal times its sense; the ball radius is \|range\| |
| `blend_type` | `R` on every face here; `E` on the one in USB hub TOP |

The face is swept by the ball. At each spine point the ball touches each support at the support's
point nearest the centre, and the face is the shorter circular arc between those two contacts.
Every interior display vertex of Pocket Wheel's 32 blend faces is 8.0000 mm (= \|range\|) from the
spine ellipse. A support can itself be a blend of radius 0. That is just its spine curve, a sharp
edge the ball rolls along; USB hub TOP has one, as the second support of its fillet.

BLEND_BOUND (type 59: `boundary`, `blend`) appears as one surface of an INTERSECTION and marks
where a blend meets one of its supports. **`boundary` is 1-based**: `boundary = 1` is the contact
line on `surface[0]`. Read that way, the curve's chart points evaluate to exactly 0 on it; read as
0-based, they miss by 3 mm. As an implicit surface: offset the point along support k's normal by
`range[k]` to where the ball centre would be, and measure that point's offset from the other
support, minus its `range`.

The blend's natural normal points away from the spine (32 of 32 Pocket Wheel faces and the TOP
face agree with the mesh). STEP has no rolling-ball surface, so `src/brep/blend.js` writes each
blend face as a bicubic B-spline interpolating the exact surface on a grid over the part of the
spine the face covers, refined until every cell centre is within 1e-8 m. The Pocket Wheel fits
come out at 2e-9 m on a 64 × 24 grid. A blend whose two contacts meet at one end (a three-sided
face) degenerates there to a point, which the volume integrator handles by closing the loop in
parameter space.

### Trimmed curves on reversed curves

A TRIMMED_CURVE runs along its basis curve only when both senses agree. USB hub TOP has
`+` trimmed curves on `-` circles, with `parm_1 > parm_2`. Reading only the trimmed curve's own
sense sends those edges the long way round the circle. No controlled model has this case.

## Writing it back out as STEP

`src/step/write.js` writes the decoded body as AP214 STEP: planes, cylinders, cones, spheres, tori
and B-spline surfaces (rational ones too), and lines, circles, ellipses and B-spline curves. Nothing
is triangulated. Two things in Parasolid have no direct STEP form, and the first version of the
writer missed both. It only round-tripped 42 of the 49 controlled models:

- **A cone's apex** is a loop with one fin and no edge. It is now kept as a vertex loop and written
  as `VERTEX_LOOP`. SolidWorks' own export splits the cone in two instead, so the apex becomes an
  ordinary vertex. Either is valid STEP.
- **A whole sphere or torus** is one face with no loops at all. STEP needs every face to have a
  boundary, so `src/brep/seams.js` cuts a sphere into two halves along two meridians and a torus
  into four quarters, the way SolidWorks does.

A closed edge with no vertex (the circle round a hole) gets one vertex at the start of its curve.
A hole's cylinder, bounded by a circle at each end, is written as one face with two loops and no
seam.

With those, the written file reads back as the native body on all 49 models. OpenCascade reads
every one as a single valid solid, and the boolean difference with SolidWorks' `model.step` is zero
in both directions on all 49. Volumes, from the exact integrator below, agree with SolidWorks'
STEP to 6e-15 relative and with closed-form values to 4e-15
([EXP-076](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-03_v0.5-EXP076.md), `test/step-write.test.js`).

**Exact volume.** `src/brep/volume.js` computes the enclosed volume straight from the surfaces and
curves. The divergence theorem turns it into a sum over faces, and Green's theorem turns each face
into an integral round its boundary in the surface's own parameters, so there is no mesh anywhere.
OpenCascade agrees on 47 of 49. On C20 (two crossed cylinders) it returns three different values
for three ways of cutting up the same solid, all about 1e-4 mm³ off the closed form; ours is 3e-12
off. The C16 loft's boundary circles are Parasolid tolerant edges (1.9e-8 m off the surface, with
2.07e-6 m declared), so its volume is only defined to about 0.025 mm³, and SolidWorks, OpenCascade
and this integrator all fall inside that.

**Real parts.** Every real part that has a solid now exports exact STEP: the 10 in the corpus,
from Parasolid 9 (plate4) to SolidWorks 2022 era files, 1,381 faces. Each file reads back as its
body, and OpenCascade reads every one as a single valid solid. The volumes are in
[validation.md](../validation.md#exact-step-export-b-rep). Where OpenCascade's own volume routine
disagrees with ours (Dekor's extrusions), its triangulation of the same file converges on our
number, as it did for C20.

---

## The join with the display mesh

The display reader and this reader were written independently. Three things hold across all
1,414 modern faces that neither was built to make true
([EXP-074](https://github.com/blussyya/sldprt-research-dump/blob/main/knowledge/evidence/2026-09-29_v0.4.9-EXP074.md)):

1. **Identity.** The display surface record's face ID is the native `FACE.node_id`, 1,414/1,414.
   Its edge table, and the face's nonzero Block1 IDs, are exactly the `node_id`s of the native
   edges around that face. The edge-table check covers 1,408 faces; the other 6 are C23's empty
   tables, where Block1 still matches.
2. **Type.** Each display tag maps to exactly one native surface type, including 4007 →
   BLENDED_EDGE and 4009 → SWEPT_SURF.
3. **Geometry.** On analytic faces, the display mesh lies on the native surface. The display
   normals agree with the oriented surface normal: 88,257 agree and 0 oppose. That count includes
   the SW2011 models, whose faces are joined by best fit because their surface records are not
   decoded. The 240 undefined normals sit at cone apexes.

| surface (modern, joined by ID) | faces | every vertex within 1e-6 m |
|---|---|---|
| plane | 645 | 645 (worst 2.5e-8 m) |
| cylinder | 292 | 120 |
| cone | 48 | 28 |
| sphere | 1 | 1 |
| torus | 38 | 2 |

The faces that are not fully on-surface are explained by where the mesh puts its boundary points.
An off-surface vertex sits on the face boundary, on the straight chord between its two neighbours
along the B-rep edge it is tagged with. The neighbours can come from either face's tessellation of
that edge, and "on" has to allow for float32 coordinates (about 1.5e-7 of the coordinate size).
EXP-074 checked chords within one face at a fixed 1e-9 m and left 314 production vertices
unexplained. Checked this way, every off-surface boundary vertex in the 10 real parts is a chord
point ([EXP-078](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-04_v0.5-EXP078.md)). What remains is a few interior vertices (listed in
[validation.md](../validation.md)).

**Legacy files join by edge set.** SolidWorks 2011 and pre-2011 meshes have no surface record, so
no face ID. Their Block1 edge IDs are still the native EDGE `node_id`s, though, and the set of them
on a display face picks out exactly one B-rep face (328 faces; with the IDs stripped from modern
files, the same rule is right on 1,410 of 1,410). plate4, which has no edge table, joins by
geometry, which is right on 625 of 625 faces when tried on modern parts up to 150 faces with
their IDs and edge tables removed. `link()` in the package does all three ([api.md](../api.md)).

So for exact geometry, the native body is the source and the mesh is not, and the face and edge
IDs connect the two exactly.

---

## The ghost partition

`Config-0-GhostPartition` is one `(partition)` section, like the main partition, but it never
holds the part ([EXP-078](https://github.com/blussyya/sldprt-research-dump/blob/staging/knowledge/evidence/2026-10-04_v0.5-EXP078.md)):

- In 61 of the 65 files that have one, it holds a single body of `body_type` 2 with no edges or
  faces: one vertex at the origin, with an integer attribute (10001). The distributor has six such
  bodies, 10001 to 10006.
- Five files with a partition have no ghost partition: C02 (all three copies), PTC GE8080-8 and
  cube.SLDPRT. The pre-2011 files have neither.
- Four files carry real geometry, as wire bodies (`body_type` 2, edges only) and sheet bodies
  (`body_type` 3, one open face each), tagged `GHOST_REF_BODY_ID_2001`:
  - C16, both eras: the loft's two profile sketches (a rectangle of 4 lines and a circle) as wires,
    and their filled regions as two planar sheets. All of it lies exactly on the part: the wires
    are part edges, the sheets are the loft's end caps.
  - Helical Bevel Gear: three planar sheets and three wires of circular arcs. The wires lie on part
    edges (4e-17 m), two of the planes are part faces, the third is a section plane 0.66 mm off
    any part face.
  - Pocket Wheel: one conical sheet that is no face of the part, plus two wires on part edges.

So the ghost partition holds the input geometry of features (profiles, sections, reference
surfaces) that SolidWorks keeps outside the solid. It never changes the exported body, which is why
exact STEP doesn't need it, but it is the first concrete piece of the feature tree: exact sketch
profiles.

---

## Not yet established

- Interior display vertices off their surface: 59 in Dekor, 47 in Helical Bevel Gear and a few
  elsewhere, up to 25 µm. They are not chord points and not explained.
- What the ghost partition's single origin vertex and its 10001… attribute stand for, and which
  features read the ghost bodies.
- The role of `(deltas)` sections and ResolvedFeatures bodies.
- The 64-byte LocalBodies prefix.
- Attribute meanings beyond their structure, and enum values beyond those observed.
- `blend_type` `E` (one face, in USB hub TOP) is evaluated by the same rolling-ball rule and fits,
  but only one example exists.
