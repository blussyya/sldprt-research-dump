# EXP098 prove: active-configuration rule for files without Config-N-ModelHeader

Verdict: partly holds.

Corpus: 222 .sldprt files (3 folders, recursive; 39 are OLE2). 9 have more than one Config-N-Partition stream; 7 of those have no ModelHeader (the claim's scope), 2 have ModelHeaders (controls). 52 configs built, 0 errors, 0 timeouts. Bar: box gap <= 1e-8 m, face count equal.

Box method (lib.js boxOf, not select.js): resolved B-rep, vertices + 1500 samples per curved edge + golden-section refinement per axis + analytic circle/ellipse extremes. Display box = union of per-face stored bounds.

## Controls (Header2 names the answer)
- 03afebf4_Profilringe: Header2 = Config-7. Config-7 gap 1e-17 (fits). Config-1 has the same native face count (7) but gap 1.3e-3 (rejected). Control passes, and shows the box is what separates configs.
- c613782b_Planka: Header2 = Config-3. Config-3 native faces 13 = display 13, gap 0. Configs 0,1,2 have 378/318/777 faces. Passes.

## Scope files (no ModelHeader)
Face count below = native (pre-split) faces; STEP faces in brackets.
- 300f9732_Carter2019 (2 cfgs, display 92): only Config-0 has 92 (STEP 104). Its gap is 2.5e-8, OVER the 1e-8 bar. Config-1 has 46 faces. Converter picks Config-0 by "lowest" (not "display"). Right answer only because it is the sole candidate.
- 118a3cb0_cut-z18 (25 cfgs, display 22): about 12 configs have 22 faces; only Config-268 has gap 0 (next best 5e-3). Converter picks 268 by display. Unique fit.
- 289756ce_cut-z071 (2 cfgs, display 18): Config-21 gap 0; Config-1 gap 1e-4. Converter picks 21. Unique fit.
- 629adcec_cut-z351 (6 cfgs, display 3): 0, 1, 4 gap 0 (tied); 2, 3, 6 gap 7.5e-4 to 1.3e-2. Converter picks 0, matches [0,1,4].
- 70477058_mt-cut-z085 (7 cfgs, display 18): 0, 1, 4 gap 0 (tied); others 1e-2 or more. Converter picks 0.
- 516a7dc5_Body1 (2 cfgs, display 8): 0, 1 tied, gap 0. Converter picks 0.
- afc71d14_Body2 (2 cfgs, display 24): 0, 1 tied, gap 0. Converter picks 0.

Tally: 6 of 7 files have at least one config inside the bar and the converter picks one of the fits. 1 of 7 (Carter) has no config inside 1e-8; converter fell back to lowest, which is the only face-count candidate. Unique fit: 3 files (118a3cb0, 289756ce, plus Carter's near-fit). Ties: 4 files. No ground truth exists for the 7, so "active" is not proven, only consistent.

## Two parts of the claim that fail as worded
1. Face count "as the converter exports it": the STEP has more faces than the display (periodic faces are split). Display vs STEP ADVANCED_FACE: 3 vs 4, 18 vs 26, 24 vs 28, 92 vs 104; only 516a7dc5 is equal (8 vs 8). The count that matches is the native, pre-split count (lib nativeFaces). Confirmed with the real toSTEP path (tie2.js).
2. The 1e-8 bar: Carter misses it at 2.5e-8. Display bounds in Carter are padded: the top face bounds exceed the B-rep by 2.5e-8 to 5e-8 (e.g. face 46 min y 0.06099995 vs plane at 0.061). Vertices there carry tolerance 1e-8. Other files show gap exactly 0. A bar of about 1e-7 would pass Carter, but that is not the claim.

## Ties export the same STEP
tie.js: for each file with 2+ configs inside the bar, exported STEP per config, FILE_NAME timestamp normalised, compared by md5 and length. 629adcec (0,1,4), 70477058 (0,1,4), 516a7dc5 (0,1), afc71d14 (0,1): identical in all four (same hash, same length). So choosing the lowest of a tie is a correct conversion for these.

## Scripts (this folder)
lib.js (box, pipeline), one.js, sweep.js, enum.js/enum.json, results-multi.json, carter.js, carter2.js, tie.js, tie2.js, results-tie.json.

## Not checked
- Single-config files (not in the claim); the earlier single sweep was partial and I did not use it.
- 3 OLE2 files (SW2000-s01, chainwheel, plate4) have no Config-N-Partition streams, so not in scope.
- Ground truth for the 7 no-header files does not exist, so the active config cannot be confirmed, only the fit.
