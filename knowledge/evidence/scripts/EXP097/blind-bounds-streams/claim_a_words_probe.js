// Exploratory probe: which grouping of bytes +92..+131 gives "five binary words in eight combinations".
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern'), zlib = require('zlib');
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: 128 * 1024 * 1024 });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: 128 * 1024 * 1024 });
const root = '/home/user/dump-validation';
const files = [];
for (const d of ['test files original', 'test files new', 'test files online']) (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) files.push(q); } })(path.join(root, d));
const recs = [];
for (const p of files.sort()) {
  const buf = fs.readFileSync(p);
  if (buf[4] !== 0 || buf[5] !== 0 || buf[6] !== 0 || buf[7] !== 4) continue;
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib);
  if (!dl) continue;
  for (const f of display.extractDisplayLists(dl, false).faces) {
    if (!f.bounds || !f.metadata) continue;
    recs.push(Buffer.from(dl.buffer, dl.byteOffset + f.geometryEnd, 132));
  }
}
// Which u32 slots in +92..+128 are binary (0 or 1) in every record?
const slots = []; for (let o = 92; o <= 128; o += 4) slots.push(o);
const binary = slots.filter(o => recs.every(rb => { const v = rb.readUInt32LE(o); return v === 0 || v === 1; }));
console.log('binary u32 slots in every record:', binary);
// Distinct combinations of values across the binary slots
const combos = {}; for (const rb of recs) { const k = binary.map(o => rb.readUInt32LE(o)).join(''); combos[k] = (combos[k] || 0) + 1; }
console.log('distinct combos over all binary slots:', Object.keys(combos).length, combos);
// Alternative: u64 words at 92+8k
const u64 = [92, 100, 108, 116, 124]; const c2 = {};
for (const rb of recs) { const k = u64.map(o => rb.readUInt32LE(o).toString(16) + ':' + rb.readUInt32LE(o + 4).toString(16)).join(' '); c2[k] = (c2[k] || 0) + 1; }
console.log('distinct u64-word combos (5 words at 92+8k):', Object.keys(c2).length);
// Count of records where each binary slot is 1
for (const o of binary) console.log('slot +' + o, 'ones', recs.filter(rb => rb.readUInt32LE(o) === 1).length);
