# The package, staging copy

This folder is the current state of [sldprt-format-research](https://github.com/blussyya/sldprt-format-research),
kept here so all work lives on the dump's `staging` branch. The main repo only gets it once the
work is finished.

Base: sldprt-format-research `61cdff2` (last commit on its `staging`). Everything newer exists only
here until then. Work since that commit:

- exact STEP for every real part with a solid: intersection curves (`src/brep/intersection.js`),
  tolerant edges, linear-extrusion SWEPT_SURF and rolling-ball BLENDED_EDGE (`src/brep/blend.js`,
  `src/brep/fit.js`, `src/brep/native.js`), volume integrator changes (`src/brep/volume.js`)
- the mesh joined to the B-rep in every version (`src/link.js`)
- tests: `test/exact.test.js`, `test/link.test.js`, and updates to the others
- docs updated to match (README, docs/)

Evidence for all of it: [EXP-078](../knowledge/evidence/2026-10-04_v0.5-EXP078.md).

To run it against the corpus in this repo: `cd package && SLDPRT_CORPUS=.. npm test`.
