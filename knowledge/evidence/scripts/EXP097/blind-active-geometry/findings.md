# EXP097 blind active-geometry check

## Verdict

The claim holds for all six files and all six IDs. The stated picks, the converter's wrong picks,
and the STEP identity among tied configurations all reproduce under an independent box method.

Two parts need qualifying:

- The converter is wrong in only two of the six files: 118a3cb0 and 289756ce. In 629adcec,
  70477058, 516a7dc5 and afc71d14 the lowest-ID pick happens to be a member of the tied set.
  It is right there by accident, not by rule.
- In 118a3cb0, the exact box match for config 268 depends on four single-vertex loop points.
  The display mesh has vertices at all four (within 2.3e-9 m). Without them the union would be
  about 2.04 mm off.

## Numbers (box gap = max per-axis difference between my B-rep box and the display union; face match = display faces matched one-to-one within 1e-6 m)

| file | configs | blind rule (faces equal and box gap <= 1e-6 m) | converter pick | converter gap | next-best gap |
|---|---|---|---|---|---|
| 118a3cb0 | 25 | 268 only (gap 0, 22/22 faces) | 0 (lowest) | 56.0 mm, 871 display vertices outside box | 5.0 mm |
| 289756ce | 2 | 21 only (gap 0) | 1 (lowest) | 0.10 mm, 0/18 faces match | 0.10 mm |
| 629adcec | 6 | 0, 1, 4 (gap 0, 3/3 faces) | 0 (in set) | 0 | 0.75 mm |
| 70477058 | 7 | 0, 1, 4 (gap 0, 18/18 faces) | 0 (in set) | 0 | 10 mm |
| 516a7dc5 | 2 | 0, 1 (gap 0, 8/8 faces) | 0 (in set) | 0 | none |
| afc71d14 | 2 | 0, 1 (gap 0, 24/24 faces) | 0 (in set) | 0 | none |

Census on the corpus (222 part files, 183 modern, 39 OLE2 legacy):

- 12 modern files have Config-N-Partition streams and no Config-N-ModelHeader.
- Six of those have more than one configuration (25, 2, 6, 7, 2, 2 partitions).
- This matches the claim.

STEP identity:

- Tied configurations export to identical STEP text in every set tested (629adcec, 70477058, 516a7dc5, afc71d14).
- In this run the raw text was identical, including the timestamp line. The two outputs were made within the same second.
- Non-tied configurations export to different text (for example 629adcec config 2, 70477058 config 2, 289756ce config 1 versus 21, 118a3cb0 config 0 versus 268).

## Controls (files that have ModelHeaders)

- 03afebf4 (2 configs, 2 headers): blind rule gives config 7 only (next-best gap 1.3 mm).
  Config-7-ModelHeader equals Header2 byte for byte. The converter picks 7 by Header2.
- c613782b (4 configs, 4 headers): blind rule gives config 3 only (next-best gap 2.4 m).
  Config-3-ModelHeader equals Header2 byte for byte. The converter picks 3 by Header2.

Both controls pass: the blind rule picks the ModelHeader configuration.

Note on c613782b config 2: its 13 display faces all match some native face, but it has 777 faces and its box is 6.3 m off. The face-count condition is what excludes it.

## Method

- Assembly: I re-implemented the converter's partition assembly with the configuration name forced. The converter's own selection is not used. The converter's decoders are reused.
- Box: my own sampler. Vertices, dense arcs for every edge (4000 samples per turn), and face interiors.
- Face interiors: uv polygons from the native pcurves where present. None of these eight files has pcurves, so polygons come from the sampled 3D arcs mapped through the surface inverse. The round trip error is at most 4e-16 m.
- Interior extremes: 60x60 grid, then pattern search on the six axis directions, kept inside the face.
- Body box: union of the face boxes. Single-vertex loops count as face points.
- Checks: display vertices inside the box, per-face match to display records, and the STEP text comparison.

## Caveats found along the way

- Eight faces in 118a3cb0 config 268 are full-circle bands whose uv loops are degenerate. Their interior is not sampled. Their extremes lie on the boundary circles (linear-in-height argument for cylinders and cones), so boundary sampling covers them.
- `src/parasolid/partition.js` reads only the first section of Config-N-Partition. The deltas section is not read. I did not check whether it changes geometry for these files.
- `readBody` looks up LocalBodies without the `Contents/` prefix. None of the six claim files has a LocalBodies stream, so this does not affect them. It is untested elsewhere.
- `/home/user/dump-validation/package` is an older tree. It has no configuration selection and always reads Config-0. It fails on 289756ce, which has no Config-0-Partition.

## Scripts (all in /home/user/dump-validation/knowledge/evidence/scripts/EXP097/blind-active-geometry/)

- `00-scan-names.js` (output `scan-names.json`): stream-name census of every part file.
- `00b-names.js`: lists stream names for one file.
- `01-inventory.js`: first probe (converter's selection, display count). Superseded.
- `probe-shape.js`: shape probe of one resolved configuration.
- `lib.js`: forced-name assembly, arc sampling, face polygons, interior extremes, box and matching.
- `02-measure-file.js` (outputs `out-<id>.json`): measures every configuration of one file.
- `run-all.sh` (log `run-all.log`): runs 02 on the six claim files and two controls in parallel.
- `10-converter-pick.js` (output `converter-pick.json`): the converter's own selection in both trees.
- `11-select.js` (output `select.json`): applies the blind rule to each file.
- `12-step-identity.js` (output `step-identity.jsonl`): STEP text comparison across configurations.
- `13-controls-raw.js` (output `controls-raw.json`): raw STEP diff, control header equality, pcurve coverage.
- `03-face-detail.js`, `04-cone-check.js`, `05-debug-extreme.js`, `06-vertex-owner.js`, `07-orphans.js`, `08-orphan-refs.js`, `09-owner29.js`: diagnostics on the cone and isolated-vertex question.
- `14-notes.js`, `15-degenerate.js`, `16-degenerate-faces.js`, `17-header.js`, `18-lone-points.js`, `19-localbodies.js`: caveat checks listed above.

## Could not check

- Shared code. The decoders, `xt.parse`, `nativeModel.build`, `Procedural.resolve`, the geometry evaluator and the display parser are the converter's own code, so a bug there would not show up here.
- Arc direction against pcurves. No file in this set has pcurves. Direction rests on the per-face match to the display records.
- Deltas. Not checked for effect on geometry.
- Corpus-wide scope. Only eight files were measured in full. The census covers all files, but the rule was only exercised on these eight.
- Exports beyond text comparison. No external STEP validator was run.
- Procedural surfaces. None of the eight files produced blend or blendBound faces in the configurations measured, so those paths are untested.
- Packaging. The `package` tree's own tests were not run.

## Process note

I did not open any file under EXP094 or the EXP-094 evidence file, and I did not open any `.claude/skills` folder. While listing directories and reading git history, I incidentally saw directory names, commit subjects and a `--stat` file list that mention EXP094. I did not read their contents.
