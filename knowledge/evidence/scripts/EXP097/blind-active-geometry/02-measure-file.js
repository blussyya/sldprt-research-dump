'use strict';
// For one file: measure every Config-N-Partition with the blind sampler and compare with the
// saved display mesh (face count, union bounds, per-face bounds). Prints one JSON object.
const path = require('path');
const L = require('./lib.js');
const file = process.argv[2];
const f = L.loadFile(file);
const tol = 1e-6;
const out = { file: path.relative('/home/user/dump-validation', file), displayFaces: f.displayFaces.length,
  displayUnion: f.displayUnion, headers: f.headers.length, configs: [] };
const t0 = Date.now();
for (const c of f.configs) {
  const a = L.assemble(f.all, c.name);
  const row = { config: c.N, name: c.name };
  if (a.error) { row.error = a.error; out.configs.push(row); continue; }
  row.localBodies = a.localBodies; row.hidden = a.hiddenBodies;
  const m = L.measure(a.parsed, { grid: 60 });
  if (!m.ok) { row.error = m.error; out.configs.push(row); continue; }
  row.nativeFaces = m.nativeFaces;
  row.faceCountEqual = m.nativeFaces === out.displayFaces;
  row.boundaryBox = { min: m.boundaryBox.min, max: m.boundaryBox.max };
  row.fullBox = { min: m.fullBox.min, max: m.fullBox.max };
  row.diffFullVsUnion = L.boxDiff(m.fullBox, f.displayUnion);
  row.diffBoundaryVsUnion = L.boxDiff(m.boundaryBox, f.displayUnion);
  row.perFaceMatch = L.matchFaces(f.displayFaces, m.faces.map(x => x.acc), tol);
  row.edgeChecks = m.edgeChecks;
  row.polyFail = m.polyFail; row.interiorSkipped = m.interiorSkipped; row.procFaces = m.procFaces; row.viaPcurve = m.faces.reduce((s,x)=>s+(x.viaPcurve||0),0); row.viaInverse = m.faces.reduce((s,x)=>s+(x.viaInverse||0),0); row.maxRoundTrip = Math.max(0,...m.faces.map(x=>x.maxRoundTrip||0));
  row.faceNotes = m.faceNotes.length; row.resolvedFitted = m.resolvedFitted; row.parsedError = m.parsedError;
  // display vertices must lie inside the B-rep box (they are points on the faces)
  let outside = 0, total = 0;
  for (const df of f.displayFaces) for (let i = 0; i < df.verts.length; i += 3) { total++; for (let k = 0; k < 3; k++) { const v = df.verts[i + k]; if (v < m.fullBox.min[k] - 1e-6 || v > m.fullBox.max[k] + 1e-6) { outside++; break; } } }
  row.displayVerticesOutsideFullBox = outside; row.displayVertices = total;
  out.configs.push(row);
}
out.ms = Date.now() - t0;
process.stdout.write(JSON.stringify(out) + '\n');
