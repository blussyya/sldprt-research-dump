# The remaining component-reference bytes

EXP-088 found that the first u32 in the feature archive's 28-byte `@comp.x0` block is the
`GHOST_REF_BODY_ID_2001` join key. This survey checks the other six u32 without assigning names to
zero fields.

Run `node survey.js` in this directory. It walks the controlled, original and online corpus,
loads every feature stream the EXP-079 reader can start, and compares each parsed component block
with the raw feature stream at component object offset +17.

The survey covers 222 SLDPRT paths. It recovers 863 unique component blocks from 205 feature
streams; 64 of those trees reach their strict end, while 141 stop later on an unsupported feature
layout. All 863 blocks precede any stop and match the raw bytes. Seventeen paths fail before a
feature tree can be loaded.

The six words after the ghost ID are zero in 862 of 863 blocks. The sole exception is a
`moCompFace_c` inside the helical gear's Plane1 feature:

```
[0, 0, 0, 0, 1, 0, 0]
```

The first word is zero because this reference does not name a ghost body. The one is at byte
offset 16 within `x0`. Thirty other `moCompFace_c` blocks have zero there, so one example is not
enough to name the field. The remaining 24 bytes are best described as zero or reserved in the
observed corpus, with one unexplained production face-reference flag.

A blind probe independently recovered the same 863 raw blocks, found no duplicate component
indices or raw mismatches, and reproduced the single exception. Its code and rows are in
`../component-block-blind/`.
