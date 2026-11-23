'use strict';
// Step 5b: another explanation for s. Does the stored cone hold the triangle (facet) normals rather than
// the vertex normals? For every face with a stored cone (aligned a104=a108=1; layouts A, B, C, oleA, oleB),
// margin_f = min over triangles of (facet normal . v) - s. "Holds the facets" needs margin_f >= 0.
// Facet normal from the stored triangle, flipped to agree with the mean of its three vertex normals.
// Control: margin with the vertex normals (must reproduce cones.js: 0 faces above +1e-6).
// Usage: node facets.js > facets.out.txt
const fs = require('fs'), path = require('path');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  .filter(r => r.lay !== 'oleX' && r.lay !== 'other' && r.a104 === 1 && r.a108 === 1);
const byFile = {}; for (const r of rows) (byFile[r.file] = byFile[r.file] || []).push(r);
const out = [];
for (const [rel, rs] of Object.entries(byFile)) {
  const b = fs.readFileSync(path.join(L.ROOT, rel)), ole = sw.container.modern.isOLE2(b);
  const dl = ole ? sw.container.ole.displayLists(b, sw.inflateZlib).bytes : sw.container.modern.findDisplayLists(b, sw.inflateRaw, sw.inflateZlib);
  const d = sw.display.extractDisplayLists(dl, ole);
  for (const r of rs) {
    const f = d.faces[r.i]; if (f.offset !== r.off) throw Error('face order changed');
    const v = L.unit(r.v), ns = L.normalsOf(f).map(L.unit);
    let mf = 2, mv = 2, mfC = 2, degen = 0;
    for (const n of ns) mv = Math.min(mv, L.dot(n, v));
    for (let t = 0; t < f.triangleIndices.length; t += 3) {
      const ix = [f.triangleIndices[t], f.triangleIndices[t + 1], f.triangleIndices[t + 2]];
      const P = q => [f.vertices[3 * q], f.vertices[3 * q + 1], f.vertices[3 * q + 2]];
      const c = L.cross(L.sub3(P(ix[1]), P(ix[0])), L.sub3(P(ix[2]), P(ix[0])));
      if (L.norm(c) < 1e-18) { degen++; continue; }
      let n = L.unit(c); const avg = ix.reduce((s, q) => [s[0] + ns[q][0], s[1] + ns[q][1], s[2] + ns[q][2]], [0, 0, 0]);
      if (L.dot(n, avg) < 0) n = n.map(x => -x);
      mf = Math.min(mf, L.dot(n, v));
      // centroid normal: mean of the three vertex normals (a cheap stand-in for the exact normal at the centroid)
      mfC = Math.min(mfC, L.dot(L.unit(avg), v));
    }
    out.push({ file: rel, i: r.i, tag: r.tag, lay: r.lay, s: r.s, mv: mv - r.s, mf: mf - r.s, mc: mfC - r.s, degen, vc: r.vc });
  }
}
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stat = xs => `n ${xs.length} min ${Math.min(...xs).toExponential(3)} p05 ${q(xs, .05).toExponential(3)} p50 ${q(xs, .5).toExponential(3)} max ${Math.max(...xs).toExponential(3)}`;
for (const [name, xs] of [['modern', out.filter(o => !/^ole/.test(o.lay))], ['legacy', out.filter(o => /^ole/.test(o.lay))]]) {
  console.log(`== ${name}: ${xs.length} faces with a stored cone`);
  console.log(' CONTROL vertex-normal margin:', stat(xs.map(o => o.mv)), '| > 1e-6:', xs.filter(o => o.mv > 1e-6).length, '| < -1e-6:', xs.filter(o => o.mv < -1e-6).length);
  console.log(' facet-normal margin:', stat(xs.map(o => o.mf)), '| < -1e-6 (a facet normal outside):', xs.filter(o => o.mf < -1e-6).length, '| < -1e-3:', xs.filter(o => o.mf < -1e-3).length, '| |m|<=1e-6:', xs.filter(o => Math.abs(o.mf) <= 1e-6).length);
  console.log(' mean-of-3-vertex-normals margin:', stat(xs.map(o => o.mc)), '| < -1e-6:', xs.filter(o => o.mc < -1e-6).length);
  const tags = {}; for (const o of xs.filter(o => o.mf < -1e-6)) tags[o.tag] = (tags[o.tag] || 0) + 1;
  console.log(' facet-outside by tag:', JSON.stringify(tags));
  for (const o of xs.filter(o => o.mf < -1e-6).sort((a, b) => a.mf - b.mf).slice(0, 6)) console.log(`   ${o.file}#${o.i} tag ${o.tag} s ${o.s.toFixed(6)} facet margin ${o.mf.toExponential(3)} vertex margin ${o.mv.toExponential(3)}`);
}
