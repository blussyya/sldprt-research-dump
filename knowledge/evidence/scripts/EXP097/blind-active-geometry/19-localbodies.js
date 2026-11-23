'use strict';
const L = require('./lib.js');
const files = process.argv.slice(2);
const res = [];
for (const p of files) {
  const f = L.loadFile(p);
  const lb = Object.keys(f.all).filter(k => /LocalBodies/.test(k));
  const rows = f.configs.map(c => { const a = L.assemble(f.all, c.name); return { N: c.N, localName: a.localName || null, localBodies: a.localBodies || 0 }; });
  res.push({ file: p.split('/').pop(), localBodyStreams: lb, withLocal: rows.filter(r => r.localName).length, merged: rows.filter(r => r.localBodies).length });
}
console.log(JSON.stringify(res));
