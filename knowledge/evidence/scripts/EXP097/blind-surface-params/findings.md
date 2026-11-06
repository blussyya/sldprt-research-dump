# EXP-097: blind check of the per-vertex (u, v) claim

## Verdict

Partly holds.

The arrays are per-vertex surface parameters. On the controlled cone, sphere and loft they put each display vertex back on the native surface, and the three controlled numbers reproduce. The general claim fails in four ways. Coverage is partial. Boundary vertices are off the surface. Some stored parameters lie outside the native domain. The swap wording is wrong for sphere and loft.

## What holds

- The optional arrays are two float32 arrays with one value per display vertex. The converter's parser enforces that.
- Controlled cone (C13): max error 1.087e-9 m over 144 vertices. The claim says 1.09e-9 m.
- Controlled sphere (C14): max error 1.242e-9 m over 5,004 vertices. The claim says 1.24e-9 m.
- Controlled loft (C16): max error 2.288e-6 m over 444 vertices, in the 4 array faces. The claim says 2.29e-6 m. The maximum is on face-boundary vertices. Interior vertices of the loft stay within 1.47e-6 m.
- On the cone, the second array is the signed axial distance. The identity B = (P - p) . a holds with zero deviation.
- Counts reproduce: 37 files, 1,545 faces, 205,327 vertices. All 37 are modern (non-OLE) files. The converter does not decode these arrays from legacy OLE files, so a zero there is a parser limit, not a finding.
- For cone and sphere, the residual sits at float32 rounding. The largest error divided by the estimated rounding floor is 0.75 (cone) and 0.86 (sphere). A 1e-7 m change to the radius shows up as a 1e-7 m error. So the 1e-9 match is specific to the native surface and is not generic.

## What fails

1. Coverage is partial. Of 1,545 array faces, 941 have no FACE with the same node_id in the body the converter reads. 41 are blend faces with no evaluator in this check. 11 joins were wrong. 3 faces did not evaluate. That leaves 549 faces (49,673 vertices) that were tested. Some files show the problem clearly. PP-2074-08 has 598 array faces, and none of them join.
2. Joins can be wrong even when the surface tags agree. Ten joins contradict the tag table. One BME280 sphere matches its tag but sits 1.5 mm to 6 mm from a native sphere of radius 25 micrometres. Such joins give metre-scale errors if no check is made.
3. Boundary vertices are off the native surface. Of 39,529 boundary vertices in the tested faces, 9,250 are off by more than 1e-7 m. Examples: sphere 1.07e-5 m (psu), B-spline 1.27e-4 m (Helical Bevel Gear), swept 6.9e-4 m (Dekor). Of 42,630 interior vertices, 180 are off by more than 1e-7 m. The cause is not verified. The pattern fits Parasolid's 1e-5 m tolerance, which would let boundary vertices snap to an edge curve. This is an inference from the data.
4. Stored parameters can lie outside the native domain. 553 B-spline vertices and 161 swept vertices do not evaluate after a clamp of 1e-6 of the domain width. On leva1 the section is closed and periodic on [0, 1], and the stored u runs to 2. Wrapping u by its period gives errors up to 2.4e-8 m on that face. The literal claim does not hold there.
5. The swap wording is wrong for two of three controls. Cone swap errors are metres (median 3.37 m, max 6.9 m). Sphere swap errors are median 5.5 mm, p95 9.7 mm, max 1.0 cm. Loft swap errors are median 4.5 mm, max 1.3 cm. The claim says metres or centimetres. Millimetres are also present.
6. Several surface types are untested. Planes and cylinders have no valid join in the corpus. No torus face carries the arrays. Blend faces have no evaluator here. Tags 4008, 4010 and 4980815 have no native join.

## Controls and numbers

Median over faces, on the usable joins, by native type. Errors in metres.

| type | faces | verts | median face p50 error | swap | shuffle | uniform random |
|---|---|---|---|---|---|---|
| CONE | 6 | 588 | 2.7e-10 | 6.1 | 2.7e-3 | 1.4e-3 |
| SPHERE | 21 | 7110 | 3.6e-10 | 1.1e-3 | 7.1e-4 | 7.8e-4 |
| B_SURFACE | 128 | 32357 | 1.9e-9 | 3.8e-3 | 9.6e-3 | 5.6e-3 |
| SWEPT_SURF | 394 | 9618 | 4.5e-9 | 6.8 | 1.5e-2 | 1.1e-2 |

The swap figure is the median over faces of the per-face median swap error. The cone and swept values are metres. The sphere and B-spline values are millimetres.

Controls on the controlled cone and sphere (C13, C14):
- Swap: cone median 3.4 m, sphere median 5.5 mm.
- Shuffled vertex pairing: cone about 1.0 cm, sphere about 8 mm.
- Uniform random (u, v) in the observed range: cone about 7.6 mm, sphere about 7 mm.
- Radius +1e-6 m: error 1.0e-6 m. Radius +1e-7 m: error 1.0e-7 m.
- x-axis rotated 1e-4 rad: error 5.0e-7 m.
- Origin of u rotated by pi: error 1.0e-2 m.

Swept faces (Dekor, 311 faces): with the sweep parameter taken as distance, the median per-face p50 error is 5.7e-9 m. With the scale applied, it is 9.7e-3 m. The converter's reading (distance, scale not applied) is the right one.

Full per-type table: `final_table.out.txt`. Per-face table: `summary.txt`.

## Scripts

All in `/home/user/dump-validation/knowledge/evidence/scripts/EXP097/blind-surface-params/`:

- `scan_corpus.js` (output `scan_corpus.out.json`): counts array faces and vertices with the converter's parser.
- `survey_types.js` (output `survey_types.out.json`): tags and native types of array faces.
- `link_all_sections.js` (output `link_all_sections.out.json`): joins rawId against every partition section.
- `tag_consistency.js` (output `tag_consistency.out.json`): tag against native surface type for each join.
- `own_eval.js`: my own evaluators. Closed forms for plane, cylinder, cone and sphere. Cox-de Boor B-splines (rational and non-rational). Swept surfaces. Reads raw node values only; does not import `src/geom/eval.js` or `src/brep/*`.
- `run_eval_makeEval.js`: shared dispatch to `own_eval.js`.
- `run_eval.js` (output `run_eval.out.json`): main check, with controls, float32 floor, and join checks.
- `summarize.js` (output `summary.txt`): per-file summary.
- `final_table.js` (output `final_table.out.txt`): per-type table, boundary and interior split.
- `boundary_outliers.js` (output `boundary_outliers.out.txt`): outliers by boundary and interior.
- `controlled_detail.js` (output `controlled_detail.out.json`): controlled numbers, swap spread, cone identity, BME280 sphere join.
- `controls.js` (output `controls.out.json`): perturbation controls and the swept scale test.
- `swept_range.js` (output `swept_range.out.json`), `swept_nan.js`, `swept_tests.js` (output `swept_tests.out.json`), `swept_check.js`: swept domain checks and the clamp test.
- `leva1_periodic.js`: periodic wrap test on leva1.
- `inspect_one.js`, `inspect_nodes.js`, `inspect_link.js`: exploration of raw nodes.

## What I could not check

- Blend faces (41 linked). No closed form written.
- Planes and cylinders. Every join in the corpus was wrong.
- Torus. No array faces carry it.
- Tags 4008, 4010, 4980815. No native join. Tag 4010 is 286 faces in PP-2074-08, whose saved body has no solid.
- Legacy OLE files. The converter does not decode these arrays, so the parser count and this check cover modern files only.
- 941 unjoined faces. The check says nothing about them.
- The cause of boundary offsets. The Parasolid tolerance explanation is inferred from the pattern, not verified against the mesher.
- Comparison with SolidWorks itself. Not available here.
- Cross-check of `src/geom/eval.js` output. My evaluators were written independently and not compared with that module.
- I read no file under EXP091 or EXP-091, and no `.claude/skills` folder. I did not run the sldprt-research-method skill.
