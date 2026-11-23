'use strict';
// Step 5a: the 1 mm fillet in the SW2022 controlled models C03 and C12 (one quarter-cylinder face, a 90 deg
// arc between two cube faces). Its true normals span exactly 90 deg, so any cone holding them has a
// half-angle of at least 45 deg (s <= 0.70711). Prints the stored s and v, the vertex normals' angles
// about the cylinder axis, the triangle (facet) normals' angles, and the cosines each would give.
// Usage: node fillet_case.js > fillet_case.out.txt
const fs = require('fs');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
for (const m of ['C03_cube_fillet_1mm', 'C12_cube_fillet_1mm_edge2']) {
  const p = `/home/user/sldprt-research-dump/test files new/SW2022/${m}/model.SLDPRT`;
  const d = sw.parse(fs.readFileSync(p));
  for (const f of d.faces) {
    if (!f.bounds || f.metadata.typeTag !== 4002) continue;
    const r = f.bounds.raw, dv = new DataView(r.buffer, r.byteOffset, r.byteLength);
    const s = dv.getFloat32(112, true), v = [116, 120, 124].map(o => dv.getFloat32(o, true));
    console.log(`${m} face ${f.metadata.rawId} tag ${f.metadata.typeTag} a104 ${dv.getUint32(104, true)} a108 ${dv.getUint32(108, true)} s ${s} (${L.deg(Math.acos(s)).toFixed(4)} deg) v ${v.map(x => x.toFixed(7))}`);
    const ns = L.normalsOf(f).map(L.unit);
    // axis: the vertex normals of a cylinder are perpendicular to it; take the cross of the two most different
    let a = null, best = 0; for (const x of ns) for (const y of ns) { const c = L.norm(L.cross(x, y)); if (c > best) { best = c; a = L.unit(L.cross(x, y)); } }
    console.log(`  axis from normals ${a.map(x => x.toFixed(6))}; |v . axis| ${Math.abs(L.dot(v, a)).toExponential(2)}`);
    const ang = n => L.deg(Math.atan2(L.dot(L.cross(v, n), a), L.dot(v, n)));
    const va = [...new Set(ns.map(n => ang(n).toFixed(4)))].map(Number).sort((x, y) => x - y);
    console.log(`  vertex-normal angles from v about the axis (deg): ${va.join(' ')}`);
    const fa = [];
    for (let t = 0; t < f.triangleIndices.length; t += 3) {
      const [i, j, k] = [f.triangleIndices[t], f.triangleIndices[t + 1], f.triangleIndices[t + 2]];
      const P = q => [f.vertices[3 * q], f.vertices[3 * q + 1], f.vertices[3 * q + 2]];
      let n = L.unit(L.cross(L.sub3(P(j), P(i)), L.sub3(P(k), P(i))));
      const avg = L.unit([0, 1, 2].reduce((s, q) => s.map((x, c) => x + ns[[i, j, k][q]][c]), [0, 0, 0]));
      if (L.dot(n, avg) < 0) n = n.map(x => -x);
      fa.push(ang(n));
    }
    const fu = [...new Set(fa.map(x => x.toFixed(4)))].map(Number).sort((x, y) => x - y);
    console.log(`  facet-normal angles from v (deg): ${fu.join(' ')}`);
    const maxV = Math.max(...va.map(Math.abs)), maxF = Math.max(...fu.map(Math.abs));
    console.log(`  largest vertex-normal angle ${maxV.toFixed(4)} deg -> cos ${Math.cos(maxV * Math.PI / 180).toFixed(6)}; largest facet-normal angle ${maxF.toFixed(4)} deg -> cos ${Math.cos(maxF * Math.PI / 180).toFixed(6)}; stored s ${s.toFixed(6)}`);
  }
}
