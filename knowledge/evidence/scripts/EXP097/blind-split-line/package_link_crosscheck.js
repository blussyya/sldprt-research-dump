// Cross-check only: runs the package's own link() on each file and prints, per mesh face, the
// package's assigned B-rep face ID next to the raw geometry label (plane axis/side) computed by
// analyze.py. This is the package against its own linking, so it is NOT the primary evidence.
// Usage: node package_link_crosscheck.js <package_src_index.js> <file.SLDPRT> <label>
'use strict';
const path = require('path');
const [, , pkgIndex, file, label] = process.argv;
const sldprt = require(path.resolve(pkgIndex));
const fs = require('fs');
const buf = fs.readFileSync(file);
const L = sldprt.link(buf);
const out = L.faces.map(f => {
  const vs = f.mesh.vertices, n = f.mesh.vertexCount;
  const xs = [], ys = [], zs = [];
  for (let i = 0; i < n; i++) { xs.push(vs[3*i]); ys.push(vs[3*i+1]); zs.push(vs[3*i+2]); }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const spread = a => Math.max(...a) - Math.min(...a);
  const ax = [xs, ys, zs].map((a, k) => ({k, spread: spread(a), c: mean(a)}));
  const planar = ax.filter(a => a.spread < 1e-9);
  return {rawId: f.id, method: f.method, vertices: n, block1: Array.from(f.mesh.block1),
          planarAxis: planar.map(p => 'xyz'[p.k] + '=' + p.c.toFixed(6))};
});
console.log(JSON.stringify({label, unmatchedMesh: L.unmatched.mesh.length, faces: out}));
