# Blind check of one-face ResolvedFeatures sections

This check was written without reading the other EXP-089 ResolvedFeatures work. It scans the raw
`Config-N-ResolvedFeatures` streams, validates each GUID-bearing section with the partition and XT
parsers, builds its Parasolid model, and then asks the EXP-079 loader whether the section range falls
inside a decoded `sgSketch` object.

## Verdict

The narrow claim holds wherever the feature reader reaches the object, but it is not true for every
one-face section in the expanded online corpus.

The 36 sections behind NQ-048 are the 34 one-plane-face sections in the original set plus the two C18
files. All 36 have the exact bytes decoded for an off-plane `sgSketch`: the preceding size is section
size + 5, the intervening flag is zero, and the four bytes after the section's eight-byte tail are zero.
The loader directly contains 13 of those 36 sections in an `sgSketch`, and every one has `onPlane=0`.
The other 23 occur after the reader stops on an undecoded class, so the matching local bytes support
the interpretation but do not independently prove the containing class.

Expanding the scan changes the result. Across all three input trees there are 516 valid one-plane-face
sections. The loader directly maps 15 to `sgSketch`, all with `onPlane=0`; 501 remain unmapped because
the reader stops early or because the section belongs to another configuration. All 516 have the
size+5 and zero-flag prefix. Only 488 have the four zero bytes following the standard section,
however. Twenty-eight online sections have a nonzero following word. One concrete counterexample is
`51065319_Mirror (opt 1-PSA)-HME_D.SLDPRT`: the section at 15768 follows a raw
`moSingleFaceRef_w` class definition, and its following bytes are `01000802`. This is a selected-face
record, not the decoded `sgSketch` layout. The size+5/flag pair is therefore common section framing;
it cannot identify `sgSketch` by itself.

## Direct feature mappings

The controlled files map as follows:

- C04, C05, C06 and C11: their only section is in `Sketch2`.
- C07 and C08: the first section is in `Sketch2`; the second is in `Sketch3`.
- Both SW2011 and SW2022 C18 files: their section is in `Sketch2`.

The three Helical Bevel Gear sections are in `Sketch2`, `Sketch9` and `Sketch10`. Every mapped sketch
has `onPlane=0`, and its stored `[outer size, flag, section size]` values and inflated size agree with
the independently parsed section.

## C04 geometry

C04's embedded body is the selected support face. It is a square plane at z = 0.01 with one loop,
four line edges, and corners at x/y = 0 or 0.01. The finished top face has the same square boundary
plus the circular hole, giving two loops and five edges. `Sketch2` itself contains one circle centered
at (0.005, 0.005) with radius 0.0025. The embedded body is therefore the support face before the cut,
not the circular sketch region.

`results.json` records every parsed section, its raw offsets and framing, its face/edge counts, and any
containing sketch recovered by the loader.
