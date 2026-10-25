Snapshot of the modules this experiment uses, copied from
[sldprt-format-research](https://github.com/blussyya/sldprt-format-research) `src/` at commit
`93b4933` + working tree of 2026-10-03 (the commit that adds the STEP writer), so the experiment
runs from this repository alone. New since EXP-075: `brep/seams.js`, `brep/volume.js`,
`step/write.js`, vertex loops in `brep/native.js` and `step/read.js`, and a warm-started B-spline
projection in `geom/eval.js`. The package's `test/step-write.test.js` runs the controlled half.
