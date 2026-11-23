# C18 supplies the split-line control NQ-029 requested

NQ-029 proposed a cube whose top face is split without changing every neighboring side face. C18
is that control. `check.js` compares C00 and C18 in the SW2011 and SW2022 sets, checks each parsed
Block1 array against the raw DisplayLists bytes, and reads the native face and edge graph.

The split line crosses the top face at `y = 0.005`, from `x = 0` to `x = 0.01`. It creates a lower
top face and leaves the upper half with the old top face ID.

| side | its own boundary | top neighbor after split | Block1 |
|---|---|---|---|
| `y = 0` | unchanged: four vertices and four edge IDs | new lower top face | unchanged byte for byte |
| `y = 0.01` | unchanged | retained upper top face | unchanged byte for byte |
| `x = 0` | gains the split midpoint and one edge ID | both top halves | grows from 6 to 8 words |
| `x = 0.01` | gains the split midpoint and one edge ID | both top halves | grows from 6 to 8 words |

The `y = 0` side is the discriminating case. In SW2011 it keeps native face 83, edge set
`{53,76,7,77}`, and raw Block1 `1,7,76,0,77,53`; its top neighbor changes from face 1 to new face
143. In SW2022 it keeps face 88, edge set `{58,81,9,82}`, and raw Block1
`1,9,81,0,82,58`; its top neighbor changes from face 1 to new face 148.

All 16 side-face arrays compared by the script match their raw array headers and payloads. The
same result in two saved eras is a useful replication, although both files represent the same
SolidWorks construction.

The controlled result answers NQ-029: adjacency to a newly created face does not by itself change
Block1 when the subject face's boundary stays the same. Boundary modification is sufficient in the
two adjacent sides that the split line reaches. Since Block1 is now decoded as edge IDs, the old
"token signature" effect has a direct structural explanation.

A fresh agent independently recovered the split position, raw sequences, native face IDs, and
neighbor replacement before this finding was promoted.
