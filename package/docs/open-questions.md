# Open questions

What is not known yet, roughly in the order it blocks useful work. Each item names what would
settle it. The research queue with full history is
[NEXT_QUESTIONS.md](https://github.com/blussyya/sldprt-research-dump/blob/main/knowledge/NEXT_QUESTIONS.md)
in the dump.

## Toward exact conversion

**Answered: the decoded body matches SolidWorks' STEP export, and we can write it.** It agrees on
all 49 controlled models to 9e-18 m (EXP-075), and the exact STEP writer produces the same solid as
SolidWorks' export on all 49 (EXP-076, [parasolid.md](format/parasolid.md#writing-it-back-out-as-step)).

**Answered: the production-only geometry.** INTERSECTION curves, tolerant edges, swept surfaces
and rolling-ball blends are all evaluated and written; every real part with a solid exports exact
STEP (EXP-078, [parasolid.md](format/parasolid.md#the-production-only-geometry)). Each type is only
as well tested as the corpus allows: one `E`-type blend, one blend whose support is a sharp edge,
extrusions only along one axis.

**The two lofts.** In C16, both eras, the embedded body differs from the exported one in
`nom_geom_state` and in several curve references. Which one SolidWorks treats as the part is
unknown.

**Interior display vertices off their surface.** Every off-surface boundary vertex is a chord
point (EXP-078), which settles EXP-074's 314. What's left is a hundred-odd interior vertices, up
to 25 µm off, mostly in Dekor and Helical Bevel Gear.

## Partition streams

- What the `(deltas)` section after each partition encodes, and whether it ever changes the body.
- The ghost partition holds feature input geometry (sketch profiles, section planes, reference
  surfaces) as wire and sheet bodies (EXP-078). Open: what the default single origin vertex stands
  for, and which feature each ghost body belongs to.
- The one-face PLANE bodies in `ResolvedFeatures`. In the controlled cubes their number follows
  the number of cuts or split lines. That is an observation, not a decoded role.
- The 64-byte prefix before the LocalBodies section, which contains the imported file's name in
  UTF-16LE and fields not yet decoded.
- How bodies are chosen for multi-configuration parts. The corpus has one configuration per part.

## DisplayLists

- The SolidWorks 2011 surface record. Legacy faces have geometry and bounding records but no
  decoded surface record, so no face ID or tag. The native body still has both.
- Block3. Every byte observed is zero.
- The optional per-vertex scalar arrays (390 faces), the eight-byte auxiliary array (8 faces), and
  the edge type tags in the edge table.
- The first 12 and last 40 bytes of the bounding record, and the per-configuration bounding record.
- Faces with zero normals. Another project's code allows them; none occur here, and the reader
  rejects them.

## Container and versions

- The modern container's directory: the reader finds streams by signature scan.
- The per-file value at stream header +0.
- Pre-2011 files are read (EXP-077). Open: what strip control 0 means beyond "single triangle",
  the two empty arrays in chainwheel's face records, and 57 chainwheel mesh vertices off the
  surfaces.
- SolidWorks versions other than 2011 and 2022 are covered only by the production parts, whose
  versions are not recorded.
- Assemblies and drawings are out of scope so far.

## Feature tree

The history (features, sketches, dimensions, configurations, materials) is in MFC `CArchive`
streams: `Config-0`, `Header`, `CMgr`, `Biography`, `History`, `Definition`, and in modern files
their counterparts inside the container. Class names are plain text (`moPart_c`,
`moRefPlane_c`, `moOriginProfileFeature_c`, `sgSketch`, …), so the stream is readable as a tree of
objects, but no object's fields are decoded. Rebuilding a part from its history would need every
feature type SolidWorks has. That is a much larger job than the geometry, and nothing in exact
STEP or STL depends on it.
