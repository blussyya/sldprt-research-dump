# EXP-097: blind test of the C18 split-line claim

## Verdict

**Partly holds.**

- The numbers hold. Every face, vertex count, strip length, edge ID and Block1 word in the claim matches the raw data. The SW2022 IDs match an independent metadata read. The SW2011 IDs match only the package's linker, not raw bytes.
- The claim that the y=0 face keeps its Block1 holds in both versions. Its neighbour changes, but its own four edges do not.
- The two x-side faces grow from six to eight Block1 words, as claimed.
- The conclusion is only partly supported. "Being next to a new face doesn't change Block1" is true here, but the reason is narrower than stated. Block1 holds the face's own boundary edge IDs. It never names the neighbour. The shared top edge (ID 7 in SW2011, ID 9 in SW2022) survives the split with the same ID, so nothing in Block1 changes.
- The data cannot show what happens when the shared edge itself changes. The split in C18 does not touch the y=0 top edge. There is one cube and one split, so the test has no variety.

## Data

Files used (all under `/home/user/dump-validation/test files new/`):

- `SW2011/C18_cube_split_line/model.SLDPRT` (split, 7 faces)
- `SW2011/C22_cube_sw2011_native/model.SLDPRT` and `SW2011/C00_cube_10mm/model.SLDPRT` (no split, 6 faces)
- `SW2022/C18_cube_split_line/model.SLDPRT` (split, 7 faces)
- `SW2022/C24_cube_sw2022_native/model.SLDPRT` and `SW2022/C00_cube_10mm/model.SLDPRT` (no split, 6 faces)

Faces are matched by raw geometry (planar, axis-aligned normal, plane offset), not by any linker. The cube spans 0 to 0.01 m. The split sits at y = 0.005 m: the two top pieces span y in [0, 0.005] and [0.005, 0.01].

## Results

Face IDs: SW2022 values are from my own metadata read, which agrees with the package on all seven IDs. SW2011 values come from the package's `link()` (edge-set matching against the B-rep). They are not raw.

### y = 0 side face (claim: id 83 / 88, unchanged)

| | before (no split) | after (C18) |
|---|---|---|
| SW2011 id 83, Block1 | `1,7,76,0,77,53` | `1,7,76,0,77,53` |
| SW2022 id 88, Block1 | `1,9,81,0,82,58` | `1,9,81,0,82,58` |

- 4 vertices, strip `[4]`, Block2 `[6]`, same vertex coordinates in the same order, in both versions and in both controls.
- The four nonzero edge IDs are 7, 53, 76, 77 (SW2011) and 9, 58, 81, 82 (SW2022). They are unchanged.

### Neighbour of the y = 0 face

- Before: the single top face. Its id is 1 (SW2022). It shares edge 9 with the y=0 face. SW2011 top id 1 shares edge 7.
- After, SW2022: the piece at y in [0, 0.005] is new id 148, Block1 `1,9,140,0,13,145`, and shares edge 9 with the y=0 face. The far piece at y in [0.005, 0.01] keeps id 1, Block1 `1,143,145,0,17,5`, and shares no edge with the y=0 face.
- After, SW2011 (package linker only): the new piece is id 143, Block1 `1,7,135,0,10,140`, sharing edge 7. Id 1 is retained as the far piece, Block1 `1,138,140,0,13,4`.
- So the neighbour does change from 1 to 143 (SW2011) and 1 to 148 (SW2022), as the claim says.

### x-side faces (claim: six to eight words)

| face | before Block1 | after Block1 |
|---|---|---|
| SW2011 x=0, id 85 | `1,4,77,0,74,57` (4 vertices, 6 words) | `1,74,4,0,57,0,135,77` (5 vertices, 8 words) |
| SW2011 x=0.01, id 81 | `1,10,75,0,76,49` (6 words) | `1,76,10,0,49,0,138,75` (8 words) |
| SW2022 x=0, id 90 | `1,5,82,0,79,62` (6 words) | `1,79,5,0,62,0,140,82` (8 words) |
| SW2022 x=0.01, id 86 | `1,13,80,0,81,54` (6 words) | `1,81,13,0,54,0,143,80` (8 words) |

Each grows by one vertex and one new edge ID (135, 138, 140, 143).

### Extra observations not in the claim

- The y = 0.01 side face (SW2011 id 79, SW2022 id 84) keeps its Block1 exactly. Its neighbour is the far top piece, which keeps id 1 but shrinks. That is a weaker test: its neighbour changes shape, not identity.
- The bottom face (SW2011 id 43, SW2022 id 48) is unchanged in both versions.

## Controls

- **Null (no split against no split).** SW2011 C22 against C00, and SW2022 C24 against C00. All six cube faces match on strips, vertices, Block1 and Block2. So the comparison finds nothing when nothing changed.
- **Positive (split against no split).** SW2011 and SW2022 C18 against their no-split pair. The x=0 and x=0.01 faces differ on every field. The top face differs on vertices and Block1. The y=0, y=0.01 and bottom faces are identical. So the comparison flags exactly the faces whose boundary changed.
- **Mutation.** I flipped one Block1 word of the y=0 face in an in-memory copy of the split model. The comparator flagged Block1 on that face. So its "same" verdict for y=0 is meaningful.

Raw-byte check: the Block1 word sequence of the y=0 face, and of each x-face, occurs exactly once in each decoded DisplayLists stream, at the offset my reader computes.

## Parser against raw bytes

- The SW2022 DisplayLists stream is found by my own scan of the modern container. Name bytes are rotated back, the raw DEFLATE body is inflated, and the inflated size and CRC-32 match the stored values.
- The SW2011 `DisplayLists__ZLB` stream is unwrapped by my own code. The 16-byte magic, the declared inflated size (7304 and 6587 bytes) and the packed length all match. Its zlib body inflates to the declared size.
- My record reader accepts 7 faces in C18 and 6 in the cube controls. Those counts match the build-log face counts. The 14 rejected candidates in C18 are 7 false signature hits and 7 failed strip checks.
- For every accepted face, the nonzero edge IDs give each boundary vertex exactly two edges. That checks the Block1 walk order.
- My SW2022 rawIds (148, 90, 88, 86, 84, 1, 48) equal the package's linker output on all seven faces.

## Scripts

Folder: `/home/user/dump-validation/knowledge/evidence/scripts/EXP097/blind-split-line/`

- `raw_streams.py`: independent OLE2 and modern-container stream extractor, with CRC and size checks.
- `decode_zlb.py`: decodes the SW2011 `DisplayLists__ZLB` wrapper.
- `dlparse.py`: independent face-record reader built from the format table. Reads rawIds for modern files only.
- `analyze.py`: geometry labelling, neighbour test, before/after comparison, raw byte search. Writes `analysis.json`.
- `controls.py`: null, positive and mutation controls. Writes `controls.json`.
- `package_link_crosscheck.js`: runs the package's `link()` for cross-checking only. This is the package against itself, not primary evidence.
- `run_all.sh <scratch_dir>`: runs the whole pipeline. A rerun into a fresh directory reproduced `analysis.json` and `controls.json` byte for byte.

## Not checked

- SW2011 face IDs (83, 1, 143) are not verified from raw bytes. My reader has no SW2011 metadata grammar. They come from the package's edge-set linker, which needs its own Parasolid parse.
- The Block1 ordering is taken from the format table in `docs/format/displaylists.md`. It is checked only by the boundary-cycle and count checks, not against the B-rep edges.
- Only one cube and one split at y = 0.005 m. No split crosses the y=0 face's own top edge, so the case where a shared edge changes is untested. That is the test that would separate "Block1 ignores neighbours" from "the shared edge kept its ID".
- No other corpus folders were used ("test files online", the other controlled models, the STEP and STL exports).
- Not read, as instructed: EXP-090 and its evidence file, and any `.claude/skills` folder. I listed directory names under `knowledge/evidence/scripts` and did not open anything in EXP097 that I did not create.
- No commit, push, or agents.
