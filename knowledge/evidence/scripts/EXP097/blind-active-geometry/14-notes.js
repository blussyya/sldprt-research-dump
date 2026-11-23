'use strict';
const L = require('./lib.js');
const f = L.loadFile(process.argv[2]);
const N = +process.argv[3];
const a = L.assemble(f.all, f.configs.find(x => x.N === N).name);
const m = L.measure(a.parsed, { grid: 60 });
const kinds = {};
for (const n of m.faceNotes) for (const s of (n.notes || [n])) { const k = typeof s === 'string' ? s.replace(/[0-9.e+-]+$/, '').trim() : String(s); kinds[k] = (kinds[k] || 0) + 1; }
const bad = m.faces.filter(x => x.acc.n === 0);
console.log(JSON.stringify({ file: process.argv[2].split('/').pop(), config: N, faces: m.nativeFaces, faceNoteKinds: kinds, facesWithNoPoints: bad.length, types: m.faces.reduce((s, x) => (s[x.type] = (s[x.type] || 0) + 1, s), {}), viaInverse: m.faces.reduce((s, x) => s + (x.viaInverse || 0), 0) }));
