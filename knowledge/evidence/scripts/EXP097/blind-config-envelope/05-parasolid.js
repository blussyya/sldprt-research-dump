'use strict';
// Parasolid section bounds for one file, using the converter's own partition and xt readers.
// For each partition-bearing stream and each section that parses, takes every POINT node's
// pvec (the converter reads vertex positions from pvec in brep/native.js) and reports the box.
const fs = require('fs');
const CONV = '/home/user/dump-validation/package/src';
const partition = require(CONV + '/parasolid/partition');
const xt = require(CONV + '/parasolid/xt');
const file = process.argv[2];
const raw = fs.readFileSync(file);
const all = partition.streams(raw);
const rows = [];
for (const [k, b] of Object.entries(all)) {
  const g = b.indexOf(partition.GUID);
  if (g < 4 || !/Partition$/.test(k)) continue;
  const secs = partition.sections(b, g - 4);
  secs.out.forEach((x, i) => {
    let parsed, err = null, box = null, nPts = 0;
    try {
      parsed = xt.parse(x.body, true);
      if (parsed.error) err = 'parse: ' + parsed.error;
      const pts = (parsed.nodes || []).filter(n => n.values && n.values.pvec).map(n => n.values.pvec);
      nPts = pts.length;
      if (pts.length) {
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (const p of pts) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], p[a]); mx[a] = Math.max(mx[a], p[a]); }
        box = { min: mn, max: mx };
      }
    } catch (e) { err = 'throw: ' + e.message; }
    rows.push({ stream: k, index: i, kind: x.kind, start: x.start, bodyBytes: x.body.length, points: nPts, box, err });
  });
}
console.log(JSON.stringify(rows, null, 1));
