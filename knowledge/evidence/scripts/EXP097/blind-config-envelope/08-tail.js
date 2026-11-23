'use strict';
// Tail position of named records vs unnamed candidates: bytes from the record start to DL end,
// and the 12 bytes before the name end, to compare the two groups.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const MAX = 128 * 1024 * 1024;
const inf = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), infz = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const R = require('./scan.json');
const ROOT = '/home/user/dump-validation';
const named = [], unnamed = [];
for (const r of R) {
  const buf = fs.readFileSync(path.join(ROOT, r.file));
  const dl = modern.findDisplayLists(buf, inf, infz);
  for (const c of r.candidates) {
    const isN = c.names.some(n => n.gapEndToRecord === -8 && n.printable);
    const row = { file: r.file.split('/').pop(), tail: dl.length - c.offset, dlLen: dl.length, after132: dl.length - (c.offset + 132) };
    if (isN) named.push(row); else unnamed.push(row);
  }
}
const q = a => { const s = a.map(x => x.tail).sort((x, y) => x - y); return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] }; };
console.log('named tail-from-record-start', q(named));
console.log('unnamed tail-from-record-start', q(unnamed));
console.log('named tail histogram (top)', Object.entries(named.reduce((a, x) => (a[x.tail] = (a[x.tail] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 8));
console.log('unnamed rows', unnamed.map(x => [x.file, x.tail]));
