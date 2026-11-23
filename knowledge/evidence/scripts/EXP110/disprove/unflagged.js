'use strict';
// Step 4c: what sits at +112..+127 when a104,a108 is not 1,1? If those words hold a valid cone for the
// face, the cone is stored whatever the flags say, and "no face has one" (part 4) is about the flag only.
// A face's floats count as a cone for that face when |v| = 1 (1e-5), 0 < s <= 1, and v is within
// 5 deg of the axis of the face's smallest mesh-normal cone (or of the plane normal on a flat face).
// Control: the same test on faces with 1,1 must pass on (nearly) all of them.
// Usage: node unflagged.js > unflagged.out.txt
const fs = require('fs'), path = require('path');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.lay !== 'oleX' && r.lay !== 'other');
const flat = r => r.spreadDeg < 1e-3, has = r => r.a104 === 1 && r.a108 === 1;
const kind = r => {
  if (r.a112 === 0 && r.a116 === 0 && r.a120 === 0 && r.a124 === 0) return 'zero';
  if (!r.v.every(Number.isFinite) || Math.abs(L.norm(r.v) - 1) > 1e-5 || !(r.s > 0 && r.s <= 1)) return 'not-a-cone';
  return 'unit-v';
};
// For a flat face the axis is its one normal; we did not store it, so use mcAxis when present else skip.
const fits = r => r.mcAxis ? L.deg(L.angle(r.mcAxis, r.v)) < 5 : null;
const groups = {};
for (const r of rows) {
  const k = `${r.ole ? 'legacy' : 'modern'} ${r.a104},${r.a108} ${flat(r) ? 'flat' : 'curved'} ${kind(r)}${kind(r) === 'unit-v' ? ' fits=' + fits(r) : ''}`;
  groups[k] = (groups[k] || 0) + 1;
}
for (const k of Object.keys(groups).sort()) console.log(k, groups[k]);
// files with no 1,1 face but unit-v floats that fit on curved faces
const files = [...new Set(rows.map(r => r.file))];
console.log('\nfiles with no flagged cone but curved faces whose floats fit them as a cone:');
for (const f of files) {
  const xs = rows.filter(r => r.file === f);
  if (xs.some(has)) continue;
  const fit = xs.filter(r => !flat(r) && kind(r) === 'unit-v' && fits(r));
  if (fit.length) console.log(`  ${f}: ${fit.length} of ${xs.filter(r => !flat(r)).length} curved faces; e.g. #${fit[0].i} flags ${fit[0].a104},${fit[0].a108} s ${fit[0].s.toFixed(6)} mesh cone ${fit[0].mcDeg && fit[0].mcDeg.toFixed(2)} deg margin ${(fit[0].minDotV !== undefined ? fit[0].minDotV - fit[0].s : NaN)}`);
}
console.log('\nexamples of unit-v floats on faces without the 1,1 flags (curved):');
for (const r of rows.filter(r => !has(r) && !flat(r) && kind(r) === 'unit-v').slice(0, 12))
  console.log(`  ${r.file}#${r.i} ${r.a104},${r.a108} s ${r.s.toFixed(6)} v ${r.v.map(x => x.toFixed(4))} mesh cone ${r.mcDeg && r.mcDeg.toFixed(2)} angle(v, mesh axis) ${r.mcAxis ? L.deg(L.angle(r.mcAxis, r.v)).toFixed(3) : '-'}`);
console.log('\nexamples on flat faces:');
for (const r of rows.filter(r => !has(r) && flat(r) && kind(r) !== 'zero').slice(0, 6))
  console.log(`  ${r.file}#${r.i} ${r.a104},${r.a108} ${kind(r)} s ${r.s} v ${r.v} raw ${r.a112} ${r.a116} ${r.a120} ${r.a124}`);
