'use strict';
// Step 2b: look closer at three things flags.js turned up.
//  (1) faces tagged plane whose mesh normals are not all equal: how far apart, which files
//  (2) layout A faces with a104=0 but nonzero words at +112..+124: what those floats are
//  (3) legacy (OLE) faces: per file, what +92/+104/+108/+128 hold
// Usage: node inspect.js > inspect.out.txt
const fs = require('fs'), path = require('path');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const L = require('./lib');
const flat = r => r.spreadDeg < 1e-3;

console.log('(1) tag=plane but mesh normals differ');
const pc = rows.filter(r => r.tag === 4001 && !flat(r));
const bins = {}; for (const r of pc) { const k = r.spreadDeg < 0.01 ? '<0.01' : r.spreadDeg < 0.1 ? '<0.1' : r.spreadDeg < 1 ? '<1' : r.spreadDeg < 10 ? '<10' : r.spreadDeg < 90 ? '<90' : '>=90'; bins[k] = (bins[k] || 0) + 1; }
console.log('  spread (deg) bins:', JSON.stringify(bins));
const byFile = {}; for (const r of pc) byFile[r.file] = (byFile[r.file] || 0) + 1;
console.log('  files:', Object.keys(byFile).length, 'top:', Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, n]) => `${n} ${f}`).join(' | '));
for (const r of pc.sort((a, b) => b.spreadDeg - a.spreadDeg).slice(0, 5)) console.log('  ex', r.file, 'face', r.i, 'spread', r.spreadDeg.toFixed(4), 'uniqNormals', r.nUniqNormals, 'a92', r.a92);
// same check on curved tags that read flat
const cf = rows.filter(r => r.tag !== null && r.tag !== 4001 && flat(r));
console.log('  non-plane tag but mesh flat:', cf.length, cf.slice(0, 5).map(r => `${r.file}#${r.i} tag ${r.tag} a92 ${r.a92}`).join(' | '));

console.log('\n(2) layout A, a104=0, nonzero +112..+124');
const nz = rows.filter(r => r.lay === 'A' && r.a104 === 0 && !(r.a112 === 0 && r.a116 === 0 && r.a120 === 0 && r.a124 === 0));
const t2 = {}; for (const r of nz) { const k = `${r.a108} tag${r.tag}`; t2[k] = (t2[k] || 0) + 1; } console.log('  by a108,tag:', JSON.stringify(t2));
const files2 = new Set(nz.map(r => r.file)); console.log('  files:', files2.size);
for (const r of nz.slice(0, 6)) console.log('  ex', r.file, r.i, 'tag', r.tag, 's', r.s, 'v', r.v.map(x => +x.toPrecision(6)), '|v|', L.norm(r.v).toFixed(6), 'raw', r.a112, r.a116, r.a120, r.a124);
// is v a unit vector there? is it the plane normal?
let unitV = 0, small = 0; for (const r of nz) { const n = L.norm(r.v); if (Math.abs(n - 1) < 1e-5) unitV++; else small++; }
console.log('  |v|=1 on', unitV, 'of', nz.length);
// planes: does v equal the face normal (mesh normal) ?
let eqN = 0, nP = 0; for (const r of nz.filter(r => r.tag === 4001)) { nP++; if (r.mcAxis === undefined && Math.abs(L.norm(r.v) - 1) < 1e-5) eqN++; }
console.log('  of those on planes:', nP);

console.log('\n(3) legacy (OLE) records per file: a92 / a104,a108 / a128 / next word');
const files3 = [...new Set(rows.filter(r => r.ole).map(r => r.file))];
for (const f of files3) {
  const xs = rows.filter(r => r.file === f), c = k => { const m = {}; for (const r of xs) { const v = r[k] === null ? 'null' : r[k] > 1000 ? 'big' : r[k]; m[v] = (m[v] || 0) + 1; } return JSON.stringify(m); };
  const p = xs.filter(r => flat(r)), pc1 = p.filter(r => r.a92 === 1).length, cc = xs.filter(r => !flat(r)), cc1 = cc.filter(r => r.a92 === 1).length;
  console.log(`  ${f}: faces ${xs.length} recRoom-min ${Math.min(...xs.map(r => r.recRoom))} | a92 ${c('a92')} | flat with a92=1 ${pc1}/${p.length}, curved with a92=1 ${cc1}/${cc.length} | a104 ${c('a104')} a108 ${c('a108')} | a128 ${c('a128')} | next ${c('u132')}`);
}
