'use strict';
// What the converter selects today: run its own readBrep (and count its faces) on each file, for
// both code trees: solidworks-converters (the converter) and dump-validation/package (the copy).
const fs = require('fs');
const trees = { converter: '/home/user/solidworks-converters/src/index.js', package: '/home/user/dump-validation/package/src/index.js' };
const files = process.argv.slice(2);
const out = [];
for (const [tree, mod] of Object.entries(trees)) {
  const sw = require(mod);
  for (const f of files) {
    const row = { tree, file: f.split('/').pop() };
    try {
      const r = sw.readBrep(f);
      row.configuration = r.configuration || null;
      row.source = r.source; row.kind = r.kind;
      row.faceNodes = r.parsed.nodes.filter(n => n.type === 14).length;
      row.error = r.parsed.error || null;
    } catch (e) { row.error = e.message; }
    out.push(row);
  }
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
