'use strict';
// Step 4b: part 4 per file. For every file that has a non-planar face with a104,a108 = 0,0 or 1,1, list
// its non-planar faces: tag, flags, smallest mesh-normal cone, stored s. Then the mixed case the claim
// rules out: a file where some narrow (mesh cone < 44 deg) non-planar face has a cone and another does not,
// and files with no cones where a108 still marks some faces 0 (the flag was computed per face there).
// Usage: node perfile.js > perfile.out.txt
const fs = require('fs'), path = require('path');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.lay !== 'oleX' && r.lay !== 'other');
for (const r of rows) if (r.spreadDeg >= 1e-3 && r.mcDeg === null) r.mcDeg = 180;
const flat = r => r.spreadDeg < 1e-3, has = r => r.a104 === 1 && r.a108 === 1;
const files = [...new Set(rows.map(r => r.file))];
let mixed = 0;
const summary = [];
for (const f of files) {
  const xs = rows.filter(r => r.file === f), np = xs.filter(r => !flat(r));
  const narrow = np.filter(r => r.mcDeg < 44), nc = narrow.filter(has).length;
  const any = xs.some(has), z = np.filter(r => r.a104 === 0 && r.a108 === 0).length;
  if (nc > 0 && nc < narrow.length) mixed++;
  summary.push({ f, lay: xs[0].lay, faces: xs.length, nonPlanar: np.length, narrow: narrow.length, narrowWithCone: nc, cones: xs.filter(has).length, zeroZero: z, wideWith01: np.filter(r => r.mcDeg >= 46 && r.a104 === 0 && r.a108 === 1).length });
}
console.log('files where some narrow (<44 deg) non-planar faces have a cone and others do not:', mixed);
console.log('\nper file (only files with non-planar faces): lay faces nonPlanar narrow narrowWithCone cones (0,0)nonPlanar wide(>=46)with(0,1)');
for (const s of summary.filter(s => s.nonPlanar)) console.log(`  ${s.lay} ${s.faces} ${s.nonPlanar} ${s.narrow} ${s.narrowWithCone} ${s.cones} ${s.zeroZero} ${s.wideWith01}  ${s.f}`);
console.log('\nno-cone files that still mark some non-planar faces (0,0) AND have narrow non-planar faces:');
for (const s of summary.filter(s => !s.cones && s.zeroZero && s.narrow)) console.log(`  ${s.f}: narrow ${s.narrow}, (0,0) ${s.zeroZero}, wide with (0,1) ${s.wideWith01}`);
console.log('\ncontrolled models and small files, face by face (non-planar):');
for (const f of files.filter(f => /test files new|NSJ8L|03afebf4|629adcec|14f9214b|e1f38af5|ChainCL/.test(f))) {
  const np = rows.filter(r => r.file === f && !flat(r));
  if (!np.length) continue;
  console.log(`  ${f}: ` + np.slice(0, 14).map(r => `#${r.i} t${r.tag} ${r.a104},${r.a108} mesh ${r.mcDeg.toFixed(2)}${has(r) ? ' s ' + r.s.toFixed(6) + ' (' + (Math.acos(r.s) * 180 / Math.PI).toFixed(3) + ' deg)' : ''}`).join(' | '));
}
