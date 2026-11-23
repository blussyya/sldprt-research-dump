# Independent production-file ghost join

This check was written without reading the other EXP-088 ghost scripts or their production output.
It applies the same proposed join to two original files whose feature reader reaches the end:
`cube.SLDPRT` and `Helical Bevel Gear.SLDPRT`.

`check.js` separately reads `GHOST_REF_BODY_ID_2001` from the ghost partition and the first
little-endian u32 of each nonzero 28-byte `@comp.x0` block in the binary feature archive. It also
compares each block with the raw feature stream at the component object's offset plus 17. The
enclosing top-level feature comes from the archive object's byte range; the target feature comes
from the reference object's explicit feature ID.

The cube has no ghost-partition stream and no nonzero component IDs of this form. The helical gear
has seven ghost bodies and seven component references. Every ID joins exactly once, all raw blocks
match, and there are no duplicate or unmatched IDs.

| ghost ID | body | reference | enclosing feature | named target |
|---:|---:|---|---|---|
| 10001 | type 2, no edge | `moCompSketchEntHandle_c` | Sketch1 | Origin |
| 10002 | type 2, no edge | `moCompSketchEntHandle_c` | Sketch2 | Origin |
| 10070 | type 3, has edges | `moCompProfile_c` | Loft2 | Sketch2 |
| 10071 | type 3, has edges | `moCompProfile_c` | Loft2 | Sketch4 |
| 10072 | type 3, has edges | `moCompProfile_c` | Loft2 | Sketch7 |
| 10073 | type 2, no edge | `moCompSketchEntHandle_c` | Sketch9 | Origin |
| 10074 | type 2, no edge | `moCompSketchEntHandle_c` | Sketch10 | Origin |

This extends the controlled-model result to one production part with several sketches and a
three-profile loft. It still does not establish every possible ghost-body role, creation ownership,
or the meaning of the other 24 bytes in the component block. Both checks depend on the existing
feature reader; reaching EOF does not decode the opaque fields it preserves or scans over.
