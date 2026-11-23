'use strict';
// Step 6b: native_check.jsonl again, dropping faces whose join fails its own control (display vertex
// normal more than 1 deg from the exact outward normal = probably the wrong native face), and per type.
// Usage: node native_summary.js > native_summary.out.txt
const fs = require('fs'), path = require('path');
const res = fs.readFileSync(path.join(__dirname, 'native_check.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stat = xs => xs.length ? `n ${xs.length} min ${Math.min(...xs).toFixed(6)} p50 ${q(xs, .5).toFixed(6)} max ${Math.max(...xs).toFixed(6)}` : 'n 0';
const all = res.filter(o => o.s !== undefined), bad = all.filter(o => o.worstDispDeg > 1), C = all.filter(o => o.worstDispDeg <= 1);
console.log('cone faces on analytic native faces:', all.length, '| dropped (display normal vs exact > 1 deg):', bad.length);
for (const o of bad) console.log(`  dropped ${o.file}#${o.i} ${o.how} ${o.type} worst ${o.worstDispDeg.toFixed(2)} deg`);
console.log('kept, display-vs-exact normal worst angle (deg):', stat(C.map(o => o.worstDispDeg)));
for (const t of ['cylinder', 'cone', 'sphere', 'torus']) {
  const X = C.filter(o => o.type === t); if (!X.length) continue;
  const m = X.map(o => o.marginExact);
  console.log(`${t}: ${X.length} (reversed ${X.filter(o => !o.sameSense).length}) | v outward at every vertex: ${X.filter(o => o.minVn > 0).length} | margin min(v.n)-s ${stat(m)} | exact normal outside cone (< -1e-6): ${m.filter(x => x < -1e-6).length} | s below cos of largest exact angle (> 1e-6): ${m.filter(x => x > 1e-6).length}`);
}
const Y = C.filter(o => o.type === 'cylinder');
console.log(`cylinders kept ${Y.length}: sign(v.radial)==sense on ${Y.filter(o => o.vRadialSign === (o.sameSense ? 1 : -1)).length}; weak |v.axis| < 1e-6 on v ${Y.filter(o => o.vAxis < 1e-6).length}, on -v ${Y.filter(o => o.negVAxis < 1e-6).length}`);
console.log('  acos(s) - half-arc (deg):', stat(Y.map(o => o.acosSDeg - o.halfArcDeg)), '| narrower than the face by > 0.01 deg:', Y.filter(o => o.acosSDeg < o.halfArcDeg - 0.01).length, '| by > 1 deg:', Y.filter(o => o.acosSDeg < o.halfArcDeg - 1).length, '| wider by > 0.01 deg:', Y.filter(o => o.acosSDeg > o.halfArcDeg + 0.01).length);
console.log('  half-arc over 45 deg but a cone stored:', Y.filter(o => o.halfArcDeg > 45.01).length, 'max half-arc', Math.max(...Y.map(o => o.halfArcDeg)).toFixed(3));
console.log('  angle v to outward bisector (deg):', stat(Y.map(o => o.vToBisectorDeg)), '| > 0.5 deg:', Y.filter(o => o.vToBisectorDeg > 0.5).length);
const mm = res.filter(o => o.type && ((o.a92 === 1) !== (o.type === 'plane')));
console.log('PART1 a92 vs native plane, all joined faces:', res.filter(o => o.type).length, 'mismatches', mm.length);
