# Independent Block3 check

This check did not read the other EXP-088 Block3 scripts or their results. It used the converter's
DisplayLists extraction and compared each accepted face's Block3 with the bytes at its recorded raw
offset. It checked the raw header (1, 8, 2), count, and alignment with Block1. It does not independently
prove the converter's face discovery is complete.

Run `node check.js`, then `node roles.js` from this directory. The scripts use the sibling converter
checkout at `/workspace/solidworks-converters`. Results are in `results.json` and `roles.json`.

## What the bytes show

The recursive online scan found 142 SLDPRT-named files, including the re-save and the `not-a-part`
folder. 124 had a readable DisplayLists stream; 18 did not. Their paths and errors are retained in
`results.json`. The readable streams contained 19,280 accepted faces and 1,903,076 Block3 bytes.
Every compared raw byte matched the parser's output.

27 files had nonzero Block3 bytes: 30,713 bytes in total. The observed values were 0, 1, 2 and 4.
The position in the strip matters:

| Block1 slot | Block3 0 | Block3 1 | Block3 2 | Block3 4 |
|---|---:|---:|---:|---:|
| strip control | 131,784 | 2,690 | 0 | 16,455 |
| nonzero edge label | 591,646 | 11,322 | 246 | 0 |
| zero edge label | 1,148,933 | 0 | 0 | 0 |

This disproves an all-zero claim for the expanded sample. It supports describing Block3 as one byte
per Block1 slot, with different observed values at control and edge slots. It does not establish
what those values mean.

## Two interpretations that fail

A value of 4 at a control slot does not mean to reverse the strip's triangle winding relative to
its stored normals. Among those strips, 16,453 already point with the normals, one points against
them, and one has both signs. All 2,690 strips with control value 1 point with their normals too.
This check takes the dot product of each triangle's cross product with the sum of its three stored
normals; a magnitude below 1e-20 is treated as flat. It is a winding check, not a surface-distance
check.

An edge's byte is not determined solely by its numeric edge ID. Carter2019 has labels 284, 278 and
774, among others, used with both 0 and 1. This could still be a property of a particular use of an
edge. The check does not establish that the ID namespace is global across every body.

The evidence does not yet choose between edge orientation, visibility, seam status, or another
per-use flag. Nonzero values alone are not enough to name the fields.
