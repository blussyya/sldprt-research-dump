'use strict';
// Step 4e: the one no-cone file where a108 marks one non-planar face 0 (like the wide faces in cone files)
// while narrow non-planar faces keep 0,1. Lists every non-planar face with flags, mesh cone and +100.
// Usage: node mixed_file.js > mixed_file.out.txt
const fs = require('fs'), path = require('path');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const f = 'test files online/2020/14f9214b_11.SLDPRT', hex = x => (x >>> 0).toString(16).padStart(8, '0');
const xs = rows.filter(r => r.file === f);
console.log(f, 'faces', xs.length, 'flags', JSON.stringify(xs.reduce((m, r) => (m[`${r.a104},${r.a108}`] = (m[`${r.a104},${r.a108}`] || 0) + 1, m), {})));
for (const r of xs.filter(r => r.spreadDeg >= 1e-3)) console.log(`  #${r.i} rawId ${r.rawId} tag ${r.tag} ${r.a104},${r.a108} mesh cone ${r.mcDeg === null ? '180' : r.mcDeg.toFixed(2)} u100 ${hex(r.a100)}`);
