'use strict';
// For config 268 of 118a3cb0: which native faces reach the display union's extreme values, and do the
// display vertices of the mismatched cone faces reach their stored bounds?
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const c = f.configs.find(x => x.N === 268);
const m = L.measure(L.assemble(f.all, c.name).parsed, { grid: 60 });
const u = f.displayUnion;
for (let k = 0; k < 3; k++) {
  const lo = m.faces.filter(x => Math.abs(x.acc.min[k] - u.min[k]) < 1e-9).map(x => x.id + ':' + x.type);
  const hi = m.faces.filter(x => Math.abs(x.acc.max[k] - u.max[k]) < 1e-9).map(x => x.id + ':' + x.type);
  console.log('axis', k, 'min attained by', lo.join(' '), '| max attained by', hi.join(' '));
}
// display faces: vertices' own extent vs stored bounds
let worst = 0; const rows = [];
for (const df of f.displayFaces) {
  if (!df.bounds || !df.verts) continue;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < df.verts.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], df.verts[i + k]); mx[k] = Math.max(mx[k], df.verts[i + k]); }
  const d = Math.max(...[0, 1, 2].map(k => Math.max(Math.abs(mn[k] - df.bounds.min[k]), Math.abs(mx[k] - df.bounds.max[k]))));
  worst = Math.max(worst, d);
  rows.push({ vertsMin: mn.map(x => +x.toFixed(6)), boundsMin: df.bounds.min.map(x => +x.toFixed(6)), gap: +d.toExponential(2) });
}
console.log('display vertex extent vs stored bounds, worst gap (m):', worst);
console.log(JSON.stringify(rows.filter(r => r.gap > 1e-5).slice(0, 4)));
