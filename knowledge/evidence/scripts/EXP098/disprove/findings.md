# EXP098 disprove: findings (draft, being updated)

Scripts here (all read-only on the converter): survey.js, worker.js (per-candidate faces/gap/STEP hash), vol.js (mesh vs B-rep volume), worker2.js + runsingle.sh/runrest.sh (single-partition control), rb.js/runrb.sh (readBody), synth.js (synthetic ties), act.js (stream inventory), z300.js.

## Corpus
222 files; 9 have more than one Config-N-Partition; 2 of those (03afebf4, c613782b) have ModelHeaders; 7 have none. 8 files have no Config-N-Partition (legacy), skipped.

## Rule on the 7 no-ModelHeader multi-partition files (readBody output, rb.out)
- 118a3cb0 (25 configs): picks 268, unique. Others gap >= 5e-3. Mesh volume vs B-rep volume agrees only for 268 (0.04 %); next best is 181 at 1.1 %. Independent support.
- 289756ce (2): picks 21, unique (Config-1 gap 1e-4). Volume: 21 is 0.09 % off the mesh, 1 is 1.5 % off.
- 629adcec (6) and 70477058 (7): tie of {0,1,4}; STEP bodies identical (same hash) among the tied ones; the non-tied differ in volume by 36 %..440 %.
- 516a7dc5, afc71d14 (2 each): tie {0,1}, identical STEP.
- 300f9732 (2): rule finds NO match (best gap 2.5e-8 > 1e-8), falls back to lowest = Config-0. Correct by luck: the other config has 46 faces vs 92 and its volume does not match; Config-0 is within 0.025 % of mesh volume. So `by:'display'` is not reported for this file.
Controls with a known answer (ModelHeader files): 03afebf4 (Header2 says 7): display rule alone gives 7, unique (gap 1e-17 vs 1.3e-3). c613782b (Header2 says 3): display rule gives 3, unique (face counts 378/318/777 vs 13). 2 of 2 agree. Weak control: only 2 files. Note readBody uses Header2 for these, not the display rule, so the rule's output was computed via worker.js.

## What fails
1. Box test is not a test of shape (synth.out). Built a candidate set from the controlled single-config cubes. With the display of the 5 mm hole cube, six candidates pass (fillet, chamfer, 3/4/5 mm holes, moved hole): same 7 faces, same box, gap <= 1.7e-18. Rule picks the first (the fillet cube, 998 mm3 vs 804 mm3 for the real one), STEP hashes all differ. The claim that tied configs export the same STEP is a fact about 4 files, not a consequence of the test. Volume (display mesh vs B-rep) separates all of them.
2. The true configuration often fails the test. Single-partition control (where the answer is certain): 205 single-partition files: 3 timed out (300 s, skipped, listed in timeouts.txt), 1 reader error (2f121983_case), 18 have no display bounds; of 183 testable, face counts match in all 183 but 27 (14.8 %) have box gap > 1e-8, 156 pass with gap <= 1.1e-15; nothing in between except 300f9732 (2.5e-8) and fails from 1.4e-7 up. So about 1 in 7 true configurations (up to 0.325 m on plancher Dalle 2020, 2.5e-7 on 1ESxx, 2.5e-8 on 300f9732's Config-0 itself). Display bounds are therefore not exact B-rep bounds, and 1e-8 sits inside the noise. In a multi-config file with such a true config, the rule either finds nothing (fallback to lowest) or fits a wrong one.
3. Fallback is not harmless. In 118a3cb0 the lowest (Config-0) has gap 5.6e-2 and a different STEP from 268 (volume 89 % under the mesh). In 289756ce lowest (1) is 1.5 % off in volume. Fallback = lowest is right only when ties include the lowest.
4. Where the rule actually adds something: only 2 of 7 files (118a3cb0, 289756ce) get a different answer than lowest. The other 5 are ties containing the lowest or the 300f9732 fallback. Evidence for the rule over lowest therefore rests on 2 files + 2 controls.
5. Untested: hidden bodies / LocalBodies (all 9 files have 0 hidden bodies), face interiors, Header2 hints for the no-ModelHeader files (none found by act.js).

## Numbers summary
- Single-partition control (true config known): 183 testable, 156 pass (85.2 %), 27 fail the 1e-8 box (14.8 %), 0 face-count mismatches. 3 timeouts, 1 error, 18 without display bounds not counted.
- Multi-partition, no ModelHeader: 7 files. Rule uniquely picks a non-lowest config in 2 (118a3cb0 -> 268, 289756ce -> 21), ties containing lowest in 4 (identical STEP hashes), no match in 1 (300f9732, fallback lowest, correct).
- ModelHeader controls: 2 of 2 agree with Header2 (03afebf4 -> 7, c613782b -> 3).
- Synthetic: 6 distinct shapes pass face count + box together (synth.out).

## Verdict
Partly holds. The rule gave answers that agree with Header2 (2 files) and with mesh volume (118a3cb0, 289756ce) on every file where it gives a unique answer. Fails as a general statement: (a) face count + box does not imply same shape, the tie claim only holds on 4 corpus files (STEP hash identical); (b) the rule misses the true configuration about 15 % of the time on single-config files, and does so on 300f9732; (c) fallback to lowest is wrong when the lowest differs (118a3cb0 would pick Config-0, 89 % volume error). Adding the volume comparison (mesh vs B-rep, vol.js) would fix (a) and partly (b).

## Check next
- Add a mesh-volume gate and re-run the 7 files; look at why 27 true configs miss the box (display padding? tessellation bounds? 300f9732's z max is 2.5e-8 above the exact circle top).
- Find a real multi-config file whose true config has a display gap above 1e-8 (none in this corpus).
- Hidden bodies and LocalBodies, per-face (not union) bounds comparison, top-level Preview/PreviewPNG of 289756ce as an independent active-config witness.
- Controls are only 2 ModelHeader files; more would help.
