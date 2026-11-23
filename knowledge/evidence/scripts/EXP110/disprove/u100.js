'use strict';
// Step 7: part 5, "the u32 at +100 is not a property of the face". Three tests.
//  (a) Split it as two u16 (hi = bytes +102..+103, lo = +100..+101). Within each file: how many distinct
//      values, distinct hi, distinct lo; is the full value unique per face?
//  (b) Controlled models: does lo pick out the faces a later feature made or cut? Native loops per face
//      (a plane with 2+ loops has a hole cut in it) next to lo, per SW2022 model.
//  (c) Same face, different saves: match faces between two files by their stored bounds (centre and
//      radius equal to 1e-9 m) and compare +100. Pairs: SW2011 C22 vs SW2022 C23 (C23 = C22 opened and
//      saved in 2022), 2013 head_back (OLE) vs its SW2026 export, SW2011 vs SW2022 builds of each C model.
//      Control for the matching: the bounds radius must also agree (it is part of the match key), and
//      we report how many faces matched.
// Usage: node u100.js > u100.out.txt
const fs = require('fs'), path = require('path');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.lay !== 'oleX' && r.lay !== 'other');
const hex = x => x === null ? 'null' : (x >>> 0).toString(16).padStart(8, '0');
const files = [...new Set(rows.map(r => r.file))];
console.log('(a) per file: faces, distinct u100, distinct hi16, distinct lo16, u100 unique per face?');
let uniq = 0, notUniq = 0, constAll = 0;
for (const f of files) {
  const xs = rows.filter(r => r.file === f), v = xs.map(r => r.a100);
  const d = new Set(v).size, dh = new Set(v.map(x => x >>> 16)).size, dl = new Set(v.map(x => x & 0xffff)).size;
  if (d === xs.length) uniq++; else notUniq++; if (d === 1) constAll++;
  if (d !== xs.length || xs.length <= 12) console.log(`  ${xs[0].lay} faces ${xs.length} distinct ${d} hi ${dh} lo ${dl}  ${f}${d === 1 ? '  value ' + hex(v[0]) : ''}`);
}
console.log(`  files where u100 is unique per face: ${uniq}; not unique: ${notUniq}; one value for every face: ${constAll}`);

console.log('\n(b) SW2022 controlled models: rawId native-type loops u100 (hi.lo)');
for (const f of files.filter(f => f.includes('SW2022/'))) {
  const xs = rows.filter(r => r.file === f);
  let M = null; try { M = sw.brep.model(sw.readBrep(path.join(L.ROOT, f)).parsed); } catch (e) {}
  const nat = id => { const n = M && M.faces.find(x => x.displayId === id); return n ? `${n.surface.type}/${n.loops.length}` : '?'; };
  console.log(`  ${f.split('/').slice(-2, -1)[0]}: ` + xs.map(r => `${r.rawId} ${nat(r.rawId)} ${hex(r.a100).slice(0, 4)}.${hex(r.a100).slice(4)}`).join(' | '));
}

console.log('\n(c) same face across saves, matched by stored bounds');
function faces(rel) {
  const b = fs.readFileSync(path.join(L.ROOT, rel)), d = sw.parse(b), R = rows.filter(r => r.file === rel), byOff = new Map(R.map(r => [r.off, r]));
  return d.faces.filter(f => f.bounds && byOff.has(f.offset)).map(f => ({ key: [...f.bounds.center, f.bounds.radius], r: byOff.get(f.offset), f }));
}
function pair(a, b) {
  const A = faces(a), B = faces(b);
  let matched = 0, same = 0, sameLo = 0, sameHi = 0, recSame = 0; const ex = [];
  for (const x of A) {
    const y = B.filter(y => y.key.every((k, i) => Math.abs(k - x.key[i]) < 1e-9));
    if (y.length !== 1) continue; matched++;
    const u = x.r.a100, w = y[0].r.a100;
    if (u === w) same++; if ((u & 0xffff) === (w & 0xffff)) sameLo++; if ((u >>> 16) === (w >>> 16)) sameHi++;
    // also: are the face's other record words identical (a copied display list) or not?
    const k = ['a92', 'a96', 'a104', 'a108', 'a112', 'a116', 'a120', 'a124'];
    if (k.every(z => x.r[z] === y[0].r[z]) && x.f.vertexCount === y[0].f.vertexCount) recSame++;
    if (ex.length < 4) ex.push(`${hex(u)}/${hex(w)}`);
  }
  console.log(`  ${a}\n    vs ${b}\n    faces ${A.length}/${B.length}, matched ${matched}, u100 equal ${same}, lo16 equal ${sameLo}, hi16 equal ${sameHi}, rest of record + vertex count equal ${recSame}; e.g. ${ex.join(' ')}`);
}
pair('test files new/SW2011/C22_cube_sw2011_native/model.SLDPRT', 'test files new/SW2022/C23_cube_sw2011_to_2022/model.SLDPRT');
pair('test files new/SW2022/C24_cube_sw2022_native/model.SLDPRT', 'test files new/SW2022/C23_cube_sw2011_to_2022/model.SLDPRT');
pair('test files online/2013/82981f2a_head_back.sldprt', 'test files online/2013/exports-SW2026/82981f2a_head_back-2026.sldprt');
for (const m of ['C00_cube_10mm', 'C03_cube_fillet_1mm', 'C04_cube_hole_5mm', 'C07_cube_two_holes', 'C10_cube_shell_1mm', 'C13_cone'])
  pair(`test files new/SW2011/${m}/model.SLDPRT`, `test files new/SW2022/${m}/model.SLDPRT`);
// control for the matcher: a file against itself must match every face with equal u100
pair('test files new/SW2022/C04_cube_hole_5mm/model.SLDPRT', 'test files new/SW2022/C04_cube_hole_5mm/model.SLDPRT');
