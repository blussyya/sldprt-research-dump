'use strict';
// EXP-102: pair-level analysis of converter_tests.json (no converter calls).
const R = require('./out/converter_tests.json');
const cubes = p => !/C1[4-6]_/.test(p) && !/C17|C19|C2[01]_/.test(p);     // exclude non-cube targets from the cube-pair summary
const rows = R.pairs.filter(p => cubes(p.target) && cubes(p.other));
// Order dependence: same unordered pair, same target, different pick by order.
const byKey = {};
for (const p of rows) { const k = p.target + '|' + p.other; (byKey[k] = byKey[k] || []).push(p); }
let orderFlip = [];
for (const k of Object.keys(byKey)) { const a = byKey[k]; if (a.length === 2 && a[0].pick !== a[1].pick) orderFlip.push({ key: k, a: a[0].order + '=>' + a[0].pick, b: a[1].order + '=>' + a[1].pick }); }
console.log('cube pair-target rows (both orders):', rows.length / 2);
console.log('rows where candidate order changes the pick:', orderFlip.length);
orderFlip.forEach(x => console.log('  ', x.key, '|', x.a, '|', x.b));
// Correct-pick count per target (order ascending as in ID order)
const asc = rows.filter(p => p.order.split('|')[0] === (p.target < p.other ? p.target : p.other));
const ok = asc.filter(p => p.pick === p.target), bad = asc.filter(p => p.pick !== p.target);
console.log('ascending-order pair rows:', asc.length, 'pick == target:', ok.length, 'pick != target:', bad.length);
bad.forEach(p => console.log('   WRONG/TIE', p.target, 'vs', p.other, 'pick', p.pick));
// Margin of the decisive residual in correct picks: target vs rival.
let minPos = Infinity, minAng = Infinity, minRow = null;
for (const p of asc) {
  if (p.pick !== p.target) continue;
  const t = p.fitRows.find(r => r.name === p.target), o = p.fitRows.find(r => r.name === p.other);
  if (!t || !o || !t.res || !o.res) continue;
  const dp = Math.abs(t.res.pos - o.res.pos), da = Math.abs(t.res.ang - o.res.ang);
  if (dp > 0 && dp < minPos) { minPos = dp; minRow = p.target + ' vs ' + p.other; }
  if (da > 0 && da < minAng) minAng = da;
}
console.log('smallest nonzero |pos diff| between pick and rival (m):', minPos, minRow);
console.log('smallest nonzero |ang diff| between pick and rival (rad):', minAng);
