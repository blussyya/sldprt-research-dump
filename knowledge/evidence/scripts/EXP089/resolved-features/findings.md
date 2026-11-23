# The one-face bodies in ResolvedFeatures

This survey locates valid Parasolid sections in `Config-N-ResolvedFeatures`, builds each body, and
uses the EXP-079 feature reader to find the smallest decoded object and top-level feature containing
the section. Run `node survey.js` in this directory to regenerate `results.json`.

The original NQ-048 set contains 34 sections, and the two C18 controls bring that set to 36. Every
section is one planar face. Where the feature reader reaches the owner, the section is inside an
`sgSketch` with `onPlane=0`, meaning a sketch attached to a selected face instead of a datum plane.
The direct mappings are C04/C05/C06/C11 to Sketch2; both sections in C07/C08 to Sketch2 and Sketch3;
both C18 versions to Sketch2; and the three helical-gear sections to Sketch2, Sketch9 and Sketch10.

The controlled geometry identifies what the body stores. C04's section is the whole 10 x 10 mm top
face before the circular cut: one square loop and four edges. The finished top face has the same
outer square plus the hole, while Sketch2 itself is only the 2.5 mm-radius circle. In C07, Sketch2
stores the untouched square support face. Sketch3 stores that face after the first hole, with two
loops and five edges. These are snapshots of the face selected to support each sketch, at that point
in feature history. They are not sketch regions or cut bodies.

The main survey covers the two C18 controls, the original set, and two later holefillets copies: 40
sections in 16 files. All 40 have one plane face and the same local wrapper. Fourteen sections fall
inside objects the current reader reaches; all 14 map to `sgSketch`, all have `onPlane=0`, and all 14
compressed byte ranges match the independently parsed section. The other 26 occur after the reader
stops, so their identical shape and framing support the same reading but do not prove the owner.

The blind check extended the scan to the online corpus and found an important boundary. One-face
sections also occur in other object types, including `moSingleFaceRef_w`. The size-plus-five and
zero-flag prefix is common section framing; it does not identify an `sgSketch`. The support-face
conclusion applies when the section is owned by the face-attached sketch, and is proved directly for
the controlled mappings above.

The independent code, full expanded rows, and counterexample are in
`../resolved-features-blind/`.
