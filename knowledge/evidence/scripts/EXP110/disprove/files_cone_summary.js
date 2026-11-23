'use strict';
// Per file: layout, faces, faces with a104,a108 = 1,1 / 0,0 / 0,1, and faces whose smallest-cone fit failed
// (normals spanning 180 deg). Also why layout B gets no tag. Usage: node files_cone_summary.js > files_cone_summary.out.txt
const rows = require('fs').readFileSync(require('path').join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const has = r => r.a104 === 1 && r.a108 === 1;
const m = {}; for (const r of rows) { if (!m[r.file]) m[r.file] = { lay: r.lay, n: 0, cones: 0, c00: 0, c01: 0, mcNull: 0 }; const x = m[r.file]; x.n++; if (has(r)) x.cones++; if (r.a104 === 0 && r.a108 === 0) x.c00++; if (r.a104 === 0 && r.a108 === 1) x.c01++; if (r.spreadDeg > 1e-3 && r.mcDeg == null) x.mcNull++; }
for (const [f, x] of Object.entries(m)) if (x.cones || x.c00 || x.mcNull) console.log(JSON.stringify(x), f);
const b = rows.filter(r => r.lay === 'B'); console.log('B ownErr', [...new Set(b.map(r => r.ownErr))]);
const nul = rows.filter(r => r.spreadDeg > 1e-3 && r.mcDeg == null); console.log('mcDeg null', nul.length, JSON.stringify(nul.slice(0, 3).map(r => [r.file, r.i, r.vc, r.nUniqNormals, r.spreadDeg])));
