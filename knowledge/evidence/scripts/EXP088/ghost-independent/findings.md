# Independent check of ghost body references

I did not read the EXP088 ghost probe. `check.js` uses the existing EXP079 feature reader and the
archived Parasolid reader, then follows the attribute and object references itself.

All 49 controlled files read without a feature-reader error. They contain 54 ghost bodies with
`GHOST_REF_BODY_ID_2001`. The attribute's integer value matches the first little-endian u32 in
`@comp.x0`, a previously unnamed 28-byte block. The check also compares that block with the raw
feature stream at the component object's byte offset plus 17. All 54 comparisons agree.

Every ghost ID has exactly one matching nonzero component reference in its file. There are no
unmatched references, unmatched bodies or duplicate body IDs. The surrounding object supplies the
feature ID; resolving that ID against the parsed top-level features gives a name.

Fifty bodies have no edge, one vertex and one point at (0, 0, 0). Every one is referenced by a
`moCompSketchEntHandle_c` whose feature ID names `Origin`. Calling these profile wires would be
misleading: their body type alone does not establish that they contain an edge.

The other four bodies occur in the two C16 loft files. Their references are `moCompProfile_c`
objects naming Sketch1 and Sketch2. In SW2022 C16, IDs 10001 and 10002 name the two origin-point
bodies, while 10003 and 10004 name the two profile bodies. The body list is in reverse ID order,
so the result does not come from pairing records by position.

Two negative checks replace the ID with ID + 1,000,000 or read the next u32 of the component
block instead. Both produce zero matches across the controlled set.

This establishes a join within these files. The IDs repeat between files and are not global
identifiers. It does not establish that every possible ghost body is referenced, that a component
reference necessarily means creation ownership, or that the remaining 24 bytes of the block are
understood. No production-file claim is made here. This check also relies on the existing feature
reader; reaching the end of its stream does not decode the raw blocks that reader preserves.

Run from any directory:

    node /workspace/sldprt-research-dump/knowledge/evidence/scripts/EXP088/ghost-independent/check.js

`results.json` contains each body, attribute ID, component reference, feature ID, raw offset and
point coordinates. `summary.json` records the captured summary from the run.
