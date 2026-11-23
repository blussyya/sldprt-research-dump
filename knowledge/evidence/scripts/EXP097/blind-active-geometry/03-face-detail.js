'use strict';
// Detail for one configuration: per display face, nearest native face box, and per native face type.
const path = require('path');
const L = require('./lib.js');
const [file, cfgN] = [process.argv[2], +process.argv[3]];
const f = L.loadFile(file);
const c = f.configs.find(x => x.N === cfgN);
const a = L.assemble(f.all, c.name);
const m = L.measure(a.parsed, { grid: 60 });
const nat = m.faces.map(x => ({ id: x.id, type: x.type, acc: x.acc, interior: x.interior }));
const used = new Set();
const rows = [];
for (const df of f.displayFaces) {
  if (!df.bounds) { rows.push({ display: 'nobounds' }); continue; }
  const db = { min: df.bounds.min, max: df.bounds.max };
  let best = null, bd = Infinity;
  for (const n of nat) { if (used.has(n.id)) continue; const d = L.boxDiff(n.acc, db); if (d < bd) { bd = d; best = n; } }
  if (best && bd < 1e-6) used.add(best.id);
  rows.push({ dispMin: db.min.map(x => +x.toFixed(6)), dispMax: db.max.map(x => +x.toFixed(6)), nearestType: best && best.type, nearestDiff: bd, nearestMin: best && best.acc.min.map(x => +x.toFixed(6)), nearestMax: best && best.acc.max.map(x => +x.toFixed(6)), nearestInterior: best && best.interior });
}
const unmatched = rows.filter(r => r.nearestDiff > 1e-6);
console.log(JSON.stringify({ file, config: cfgN, nativeFaceTypes: nat.reduce((s, x) => (s[x.type] = (s[x.type] || 0) + 1, s), {}), unmatchedCount: unmatched.length, unmatched }, null, 1));
