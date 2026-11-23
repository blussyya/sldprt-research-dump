'use strict';
// (a) Raw STEP difference between candidate configurations: which lines differ, and whether all are timestamp lines.
// (b) Control files: which Config-N-ModelHeader equals Header2 exactly, and each ModelHeader's length.
// (c) Pcurve coverage per file: how many edge arcs were checked against pcurves.
const L = require('./lib.js');
const stepExport = require(L.CONV + '/step/export.js');
const out = {};
const rawDiff = (A, B) => { const a = A.split('\n'), b = B.split('\n'); const d = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) d.push({ i, a: (a[i] || '').slice(0, 120), b: (b[i] || '').slice(0, 120) }); return d; };
const tsRe = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
out.stepRawDiff = {};
for (const [id, nums] of [['629adcec', [0, 1, 4]], ['70477058', [0, 1, 4]], ['516a7dc5', [0, 1]], ['afc71d14', [0, 1]]]) {
  const f = L.loadFile(require('child_process').execSync(`find "/home/user/dump-validation/test files online" -iname "${id}*" | head -1`).toString().trim());
  const T = {};
  for (const N of nums) { const a = L.assemble(f.all, f.configs.find(x => x.N === N).name); T[N] = stepExport.toSTEP(a.parsed, {}).text; }
  out.stepRawDiff[id] = nums.slice(1).map(N => { const d = rawDiff(T[nums[0]], T[N]); return { vs: N, diffLines: d.length, allTimestampOrFile: d.every(x => tsRe.test(x.a) || tsRe.test(x.b) || /FILE_NAME/.test(x.a)), sample: d.slice(0, 2) }; });
}
out.controls = {};
for (const id of ['03afebf4', 'c613782b']) {
  const f = L.loadFile(require('child_process').execSync(`find "/home/user/dump-validation/test files online" -iname "${id}*" | head -1`).toString().trim());
  const h2 = f.all.Header2;
  out.controls[id] = { header2Bytes: h2 ? h2.length : null, headers: f.configs.map(c => { const hk = c.name.replace(/-Partition$/, '-ModelHeader'); const k = Object.keys(f.all).find(x => x === hk || x === 'Contents/' + hk.replace(/^Contents\//, '')); const hb = k ? f.all[k] : null; return { N: c.N, hasHeader: !!hb, equalToHeader2: !!(hb && h2 && hb.length === h2.length && hb.every((x, i) => x === h2[i])), headerBytes: hb ? hb.length : null }; }) };
}
out.pcurveCoverage = {};
for (const id of ['118a3cb0', '289756ce', '629adcec', '70477058', '516a7dc5', 'afc71d14', '03afebf4', 'c613782b']) {
  const o = JSON.parse(require('fs').readFileSync('out-' + id + '.json', 'utf8'));
  const ch = o.configs.filter(c => !c.error).map(c => c.edgeChecks);
  out.pcurveCoverage[id] = { pcurveChecked: ch.reduce((s, x) => s + x.checked, 0), offCurve: ch.reduce((s, x) => s + x.offCurve, 0), outsideArc: ch.reduce((s, x) => s + x.outsideArc, 0), viaPcurveFaces: o.configs.filter(c => !c.error).map(c => c.viaPcurve || 0).reduce((s, x) => s + x, 0), viaInverseFaces: o.configs.filter(c => !c.error).map(c => c.viaInverse || 0).reduce((s, x) => s + x, 0), maxRoundTripAll: Math.max(...o.configs.filter(c => !c.error).map(c => c.maxRoundTrip || 0)) };
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
