# Blind check: Block3 edge bytes and face continuity

This check was written independently after the positional Block3 result. It tests one claim:
whether edge bytes 1 and 2 line up with smooth and open native edges. It does not try to explain
the bytes at strip-control positions.

Run `node check.js` in this directory. The script walks all 142 online paths. It selects the 27
files with nonzero Block3 data, joins a display face to the selected native body by its stored face
ID, and accepts an edge label only when that edge occurs in the joined native face's loops. For a
two-sided native edge it compares the two faces' stored display normals at identical shared
float32 vertex coordinates. `results.json` retains every accepted edge and the exclusions.

## Byte 1 follows smooth joins, but it is not a complete tangent-edge label

The check found 2,447 two-sided native edges with display data on both owning faces:

| bytes on the two face uses | edges | median of each edge's worst normal angle | under 0.001 rad | over 0.05 rad |
|---|---:|---:|---:|---:|
| 0 / 0 | 1,974 | 1.5708 rad | 10 | 1,961 |
| 1 / 1 | 371 | 0.000104 rad | 363 | 0 |
| 0 / 1 | 102 | 0.000185 rad | 102 | 0 |

Every edge with a byte 1 is smooth or nearly smooth by this measurement. None is over 0.05 rad;
469 of 473 are under 0.01 rad, and 465 are under 0.001 rad. This supports treating byte 1 as a
smooth/tangent-edge-use marker in these files.

It is not a necessary marker for every geometrically tangent edge. Ten 0/0 edges are under
0.001 rad. All ten are in `3c4752f1`, and several compare analytic surfaces with B-spline faces.
The native surface evaluator also finds the checked examples tangent to rounding scale, so they
are not explained by display-normal agreement alone. A further three 0/0 edges lie between 0.001
and 0.05 rad.

The 102 mixed 0/1 edges explain why the same edge ID can carry different bytes on its two face
uses. All are tangent by the normal check. In this sample, 93 join a plane to a cylinder and nine
join a plane to a cone; the curved face has byte 1 and the plane has byte 0 every time. The byte is
therefore attached to an edge use on a face, not only to the topological edge. The data does not
yet settle whether it means tangent classification, tangent-edge display treatment, smoothing, or
another per-face use of the same fact.

## Byte 2 follows open boundaries in the native subset we can join

Six native edges, covering 66 annotated mesh segments, have only one owning face. Every one has
byte 2. No joined two-owner edge has byte 2, and no joined one-owner edge has byte 0 or 1. All six
come from `3c4752f1`.

This supports an open/sheet-boundary interpretation, but the coverage is narrow. Block3 byte 2
appears on more display labels than can be joined to the converter's selected native body. Those
unmatched labels may belong to other bodies, and this script does not use them to generalize the
claim.

## Limits

The comparison excludes 2,586 display faces whose stored ID is not in the selected native body,
and 875 annotated uses whose ID is not in the joined native face's loops. This is deliberate: an
edge number without its owning face and body is not enough to establish correspondence.

The continuity measure uses stored display normals at exactly shared vertices. It is independent
of the B-rep surface evaluator for the corpus-wide count, but it is still a tessellation measure,
not a mathematical proof of G1 continuity. A controlled SolidWorks pair that changes only tangent
edge display style is still needed to separate geometric smoothness from display treatment and to
explain the 0/0 tangent exceptions.
