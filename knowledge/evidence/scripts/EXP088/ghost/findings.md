# Ghost body references (draft, 2026-11-04)

The controlled files give us a direct link from the feature archive to every ghost body.
`GHOST_REF_BODY_ID_2001`, a body attribute in the Parasolid ghost partition, equals the first
little-endian u32 in the feature reader's opaque `@comp.x0` field. This is an ID match within
one file and configuration, not a global feature ID.

Run `node knowledge/evidence/scripts/EXP088/ghost/join.js` from the dump root. It uses the
current converter for stream/Parasolid reading and the archived EXP-079 feature reader.
`controlled.json` records input hashes, parse status, body attributes and matching references.

All 49 controlled files have fully read feature archives. Their 54 ghost bodies all have a
matching component reference; no nonzero component ID in this probe is left unmatched.

- 50 bodies are point-only bodies. Each matching `moCompSketchEntHandle_c` names feature 5,
  `Origin`, and has `sgPointHandle.id = 0`. This explains the repeated single-point ghost as
  an Origin reference used by a sketch, rather than an unexplained piece of the finished solid.
- The remaining four are the two loft profile sheets in each C16 version. Their
  `moCompProfile_c` references occur inside `Loft1` and name `Sketch1` or `Sketch2`.
  In SW2022 those feature IDs are 26 and 29; in SW2011 they are 18 and 21.
- In C16 SW2022, ghost IDs 10001 and 10002 refer to Origin points used by the two sketches.
  IDs 10003 and 10004 refer to the profile sheets for Sketch1 and Sketch2 respectively.

This corrects EXP-078's description of C16. The two type-2 bodies have no edges. The four lines
and circle belong to the boundaries of the two type-3 sheets, not to separate profile wire
bodies. The earlier survey counted geometry without assigning it to its owning body.

This probe only covers Config-0 of the controlled files. It does not establish the meaning
of the remaining 24 bytes in `@comp.x0`, full component-reference lifetime, or all ghost body
roles in production parts. Matching small sequential IDs alone is not independent proof of
semantics; the named reference classes, target feature IDs and body geometry provide the
additional evidence. A fresh independent check is still required before calling this verified.
