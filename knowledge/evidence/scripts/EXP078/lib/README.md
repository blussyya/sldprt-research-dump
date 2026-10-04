Snapshot of the modules this experiment uses, copied from
[sldprt-format-research](https://github.com/blussyya/sldprt-format-research) `src/` at commit
`61cdff2` + working tree of 2026-10-04 (the commit that adds exact STEP for every part), so the
experiment runs from this repository alone. New since EXP-077: `brep/intersection.js`, `brep/fit.js`,
`brep/blend.js`, `link.js`; SWEPT_SURF, BLENDED_EDGE, BLEND_BOUND, tolerant edges and the trimmed-curve
sense rule in `brep/native.js`; extrusion, blend and blend-bound distances and faster B-spline
projection in `geom/eval.js`; the volume integrator changes listed in the evidence note; extrusions in
`step/write.js` and `step/read.js`.
