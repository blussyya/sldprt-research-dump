'use strict';
// Step 4: claim parts 3 and 4 on the mesh. Uses aligned words (layout B and oleB shifted +8); skips oleX.
// Part 3: |v|, s >= 1/sqrt2, and margin = min_i(n_i.v) - s over the face's (normalised) vertex normals.
//   "holds the face's normals" needs margin >= 0; "s never lower than the cos of the largest angle"
//   needs margin <= 0. Both at once force margin = 0 up to float32 rounding (~1e-7).
// Part 4: per file, non-planar faces whose smallest mesh-normal cone is under 45 deg, with and without
// a stored cone. Also the half-angle distribution by (a104,a108).
// Control: a random unit vector in place of v, and the normalised mean normal in place of v.
// Usage: node cones.js > cones.out.txt
const fs = require('fs'), path = require('path');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.lay !== 'oleX' && r.lay !== 'other');
// minCone fails (NaN, stored as null) on 7 faces whose normals span 180 deg; count those as 180 deg
let nNull = 0; for (const r of rows) if (r.spreadDeg >= 1e-3 && r.mcDeg === null) { r.mcDeg = 180; nNull++; }
const flat = r => r.spreadDeg < 1e-3;
const has = r => r.a104 === 1 && r.a108 === 1;
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const stat = xs => xs.length ? `n ${xs.length} min ${Math.min(...xs).toExponential(3)} p50 ${q(xs, .5).toExponential(3)} max ${Math.max(...xs).toExponential(3)}` : 'n 0';
const R2 = Math.SQRT1_2;

for (const grp of [['modern A+B+C', r => !r.ole], ['legacy oleA+oleB', r => r.ole]]) {
  const xs = rows.filter(grp[1]), cs = xs.filter(has);
  console.log(`\n===== ${grp[0]}: ${xs.length} faces, ${cs.length} with a104=a108=1, in ${new Set(cs.map(r => r.file)).size} files`);
  console.log('by layout:', JSON.stringify(cs.reduce((m, r) => (m[r.lay] = (m[r.lay] || 0) + 1, m), {})));
  console.log('|v|-1:', stat(cs.map(r => Math.abs(r.vLen - 1))));
  console.log('s:', stat(cs.map(r => r.s)), '| s < 1/sqrt2:', cs.filter(r => r.s < R2).length, '| s > 1:', cs.filter(r => r.s > 1).length);
  const m = cs.map(r => r.minDotV - r.s);
  console.log('margin = min(n.v) - s:', stat(m));
  console.log('  margin < -1e-6 (some vertex normal outside the cone):', m.filter(x => x < -1e-6).length, '| < -1e-3:', m.filter(x => x < -1e-3).length, '| < -1e-2:', m.filter(x => x < -1e-2).length);
  console.log('  margin > +1e-6 (s below cos of the largest angle):', m.filter(x => x > 1e-6).length, '| > 1e-3:', m.filter(x => x > 1e-3).length);
  console.log('  |margin| <= 1e-6:', m.filter(x => Math.abs(x) <= 1e-6).length);
  for (const r of cs.filter(r => r.minDotV - r.s < -1e-3).sort((a, b) => (a.minDotV - a.s) - (b.minDotV - b.s)).slice(0, 8))
    console.log(`   worst-in: ${r.file}#${r.i} tag ${r.tag} s ${r.s.toFixed(6)} min(n.v) ${r.minDotV.toFixed(6)} meshCone ${r.mcDeg && r.mcDeg.toFixed(3)} deg acos(s) ${L.deg(Math.acos(r.s)).toFixed(3)} deg vc ${r.vc} uniqN ${r.nUniqNormals}`);
  for (const r of cs.filter(r => r.minDotV - r.s > 1e-3).sort((a, b) => (b.minDotV - b.s) - (a.minDotV - a.s)).slice(0, 8))
    console.log(`   worst-out: ${r.file}#${r.i} tag ${r.tag} s ${r.s.toFixed(6)} min(n.v) ${r.minDotV.toFixed(6)} meshCone ${r.mcDeg && r.mcDeg.toFixed(3)} deg acos(s) ${L.deg(Math.acos(r.s)).toFixed(3)} deg`);
  console.log('angle v to smallest mesh-normal cone axis (deg):', stat(cs.filter(r => r.angVMinCone !== undefined).map(r => r.angVMinCone)));
  console.log('angle v to mean mesh normal (deg):', stat(cs.map(r => r.angVMean)));
  console.log('smallest-cone fit failed (set to 180 deg) on', nNull, 'faces of the whole corpus');
  console.log('acos(s) - smallest mesh-cone half-angle (deg):', stat(cs.filter(r => r.mcDeg !== undefined).map(r => L.deg(Math.acos(Math.min(1, r.s))) - r.mcDeg)));
  // controls: replace v by a random unit vector -> margin should be far from 0 and often negative
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const rv = () => L.unit([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
  const ctlR = cs.map(r => { const v = rv(); return Math.acos(Math.max(-1, Math.min(1, L.dot(v, L.unit(r.v))))); });
  console.log('CONTROL random v: angle to stored v (deg)', stat(ctlR.map(L.deg)));
  // part 4
  const files = [...new Set(xs.map(r => r.file))];
  let on = 0, off = 0; const viol = [];
  const bucket = {};
  for (const f of files) {
    const fx = xs.filter(r => r.file === f), any = fx.some(has);
    any ? on++ : off++;
    for (const r of fx) if (!flat(r) && r.mcDeg !== undefined) {
      const b = r.mcDeg < 40 ? '<40' : r.mcDeg < 45 ? '40-45' : r.mcDeg < 50 ? '45-50' : '>=50';
      const k = `${any ? 'fileHasCones' : 'fileNoCones'} ${b} ${r.a104},${r.a108}`; bucket[k] = (bucket[k] || 0) + 1;
      if (any && r.mcDeg < 40 && !has(r)) viol.push(r);
    }
  }
  console.log(`PART4 files with any cone ${on}, without ${off}`);
  for (const k of Object.keys(bucket).sort()) console.log('  ', k, bucket[k]);
  const vf = {}; for (const r of viol) vf[r.file] = (vf[r.file] || 0) + 1;
  console.log(`PART4 non-planar faces with mesh cone < 40 deg but no stored cone, in files that store cones: ${viol.length} in ${Object.keys(vf).length} files`);
  for (const [f, n] of Object.entries(vf).slice(0, 15)) console.log('   ', n, f, 'of', xs.filter(r => r.file === f && !flat(r) && r.mcDeg < 40).length, 'such faces');
  for (const r of viol.slice(0, 8)) console.log(`   ex ${r.file}#${r.i} tag ${r.tag} meshCone ${r.mcDeg.toFixed(2)} deg a104,a108 ${r.a104},${r.a108} vc ${r.vc}`);
  const big = xs.filter(r => has(r) && r.mcDeg !== undefined && r.mcDeg > 45.5);
  console.log(`faces with a stored cone whose mesh cone is over 45.5 deg: ${big.length}`, big.slice(0, 5).map(r => `${r.file}#${r.i} ${r.mcDeg.toFixed(2)} s ${r.s}`).join(' | '));
  const nc = xs.filter(r => !flat(r) && !xs.some(y => y.file === r.file && has(y)));
  const t00 = nc.filter(r => r.a104 === 0 && r.a108 === 0).map(r => r.mcDeg), t01 = nc.filter(r => r.a104 === 0 && r.a108 === 1).map(r => r.mcDeg);
  console.log('no-cone files, non-planar faces: mesh cone (deg) of (0,0) faces:', stat(t00), '| of (0,1) faces:', stat(t01));
  const c00 = xs.filter(r => !flat(r) && r.a104 === 0 && r.a108 === 0 && xs.some(y => y.file === r.file && has(y))).map(r => r.mcDeg);
  console.log('cone files, non-planar faces without a cone (all (0,0)?): mesh cone (deg)', stat(c00), '| (0,1) non-planar in cone files:', xs.filter(r => !flat(r) && r.a104 === 0 && r.a108 === 1 && xs.some(y => y.file === r.file && has(y))).length);
  const pl = xs.filter(r => flat(r) && has(r));
  console.log(`planar (mesh) faces with a stored cone: ${pl.length}`);
}
