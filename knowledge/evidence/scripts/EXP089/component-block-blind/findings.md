# Blind check of the component block tail

This check was written without reading the first EXP-089 component-block probe. It uses the
EXP-079 archive reader, enumerates each parsed `@comp` object once by archive index, and compares
the 28-byte `x0` field directly with the raw `Config-0-ResolvedFeatures` stream at object offset
`+17`.

Run `node check.js` from the dump root. The compact per-file coverage and the one nonzero tail are
in `results.json`.

## Result

The recursive scan found 222 SLDPRT paths. The existing feature reader reached a
`Config-0-ResolvedFeatures` stream far enough to recover components in 205 files; 64 of those
feature trees reached their declared end. It recovered 863 distinct component objects:

- all 863 component blocks match the raw stream at the derived offset;
- no file has a duplicate parsed component index;
- after the first u32, the remaining six u32 are all zero in 862 components;
- the only exception is the helical gear's `Plane1` `moCompFace_c`. Its seven words are
  `[0, 0, 0, 0, 1, 0, 0]`.

The exception lies in a feature tree that reads to its end. Its nonzero value is word 4 of `x0`,
16 bytes after the field starts. One example is not enough to name it. In particular, calling it
a face, plane, ownership or activity flag would go beyond the evidence.

The first word is already known from EXP-088 to hold the document-local ghost-body join ID when
one is present. This scan supports describing the other 24 bytes as zero or reserved in the
observed corpus, with one unexplained flag in a production face reference. It does not establish
that the six words are permanently reserved.

## Coverage limit

The reader stopped before the end in 141 of the 205 parsed feature streams, but every component
reported here occurs before that stop and is checked against its raw bytes. Seventeen paths fail
before a feature stream can be loaded. The result is therefore a check of every component the
current reader can reach, not proof about components hidden after unsupported layouts.
