#!/usr/bin/env node
/* EXP-066 — independent check of v0.3's C04 STL finding.
 *
 * parser/v0.3/WEB_VALIDATION.md reports that C04's supplied STL is missing the
 * triangles on one cap: "parser has 38 triangles on z=0.01 m, STL has zero;
 * opposite plane 38 parser vs 44 STL". That conclusion matters, because it says
 * the REFERENCE is deficient rather than the parser -- exactly the kind of claim
 * that needs checking by someone other than its author.
 *
 * This reads the binary STL directly in Node. It does not use compare-stl.py,
 * numpy, or any of v0.3's comparison code, so it shares no arithmetic with the
 * claim it is testing. C00 and C10 are included as controls: if the method
 * reported a missing cap everywhere it would be measuring itself.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v3 = require(path.join(ROOT, 'parser/v0.3/src/parser-core.js'));
const iR = b => new Uint8Array(zlib.inflateRawSync(b));
const iZ = b => new Uint8Array(zlib.inflateSync(b));

function readBinarySTL(f) {              // binary STL, millimetres
  const b = fs.readFileSync(f);
  const n = b.readUInt32LE(80), tris = [];
  if (84 + n * 50 > b.length) throw Error(`STL declares ${n} triangles, file too short`);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50, v = [];
    for (let k = 0; k < 3; k++)
      v.push([b.readFloatLE(o + 12 + k * 12), b.readFloatLE(o + 16 + k * 12), b.readFloatLE(o + 20 + k * 12)]);
    tris.push(v);
  }
  return tris;
}

const EPS = 1e-4;                        // mm
const ALL = fs.readdirSync(path.join(ROOT, 'test files new/SW2011'))
  .filter(d => fs.statSync(path.join(ROOT, 'test files new/SW2011', d)).isDirectory()).sort();
const summary = [];
for (const model of ALL) {
  const dir = path.join(ROOT, 'test files new/SW2011', model);
  const stlF = path.join(dir, 'model.STL');
  if (!fs.existsSync(stlF)) { console.log(`${model}: no STL`); continue; }
  const tris = readBinarySTL(stlF);
  const r = v3.parseSLDPRT(fs.readFileSync(path.join(dir, 'model.SLDPRT')), iR, iZ);
  if (r.errors.length) { console.log(`${model}: parser errors ${r.errors}`); continue; }

  // extremes taken from the PARSER's geometry, so the STL cannot define its own pass mark
  let zmin = Infinity, zmax = -Infinity, pTris = 0;
  for (const f of r.faces)
    for (let i = 0; i < f.vertices.length; i += 3) {
      const z = f.vertices[i + 2] * 1000;
      zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
    }
  const onPlane = (pts, z) => pts.every(p => Math.abs(p - z) < EPS);
  let pTop = 0, pBot = 0;
  for (const f of r.faces) {
    const v = f.vertices, idx = f.triangleIndices;
    for (let i = 0; i < idx.length; i += 3) {
      pTris++;
      const zs = [0, 1, 2].map(k => v[idx[i + k] * 3 + 2] * 1000);
      if (onPlane(zs, zmax)) pTop++;
      if (onPlane(zs, zmin)) pBot++;
    }
  }
  const sTop = tris.filter(t => onPlane(t.map(p => p[2]), zmax)).length;
  const sBot = tris.filter(t => onPlane(t.map(p => p[2]), zmin)).length;
  summary.push({ model, stl: tris.length, parser: pTris, sTop, pTop, sBot, pBot,
    missing: (sTop === 0 && pTop > 0) || (sBot === 0 && pBot > 0) });
}
console.log('model'.padEnd(30) + ['STLtri','PARtri','z+:STL','z+:PAR','z-:STL','z-:PAR'].map(x=>x.padStart(8)).join(''));
for (const s of summary)
  console.log(s.model.padEnd(30) + [s.stl,s.parser,s.sTop,s.pTop,s.sBot,s.pBot].map(x=>String(x).padStart(8)).join('') + (s.missing?'   <- STL drops a whole plane':''));
const bad = summary.filter(s => s.missing);
console.log(`\nmodels where the STL has ZERO triangles on a plane the parser populates: ${bad.length}/${summary.length}`);
console.log('  ' + bad.map(s=>s.model).join('\n  '));
console.log(`models where STL and parser triangle counts differ: ${summary.filter(s=>s.stl!==s.parser).length}/${summary.length}`);
