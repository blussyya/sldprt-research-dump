// Exploratory probe: what the 132-byte bounding records look like, using the package display parser.
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern'), zlib = require('zlib');
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: 128 * 1024 * 1024 });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: 128 * 1024 * 1024 });
const root = '/home/user/dump-validation';
const dirs = ['test files original', 'test files new', 'test files online'];
const files = [];
for (const d of dirs) (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) files.push(q); } })(path.join(root, d));
const hist = {}; const tuples = {}; let recs = 0, gated = 0, fileSet = new Set();
let sample = [];
for (const p of files.sort()) {
  const buf = fs.readFileSync(p);
  if (buf[4] !== 0 || buf[5] !== 0 || buf[6] !== 0 || buf[7] !== 4) continue; // modern only
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib);
  if (!dl) continue;
  const r = display.extractDisplayLists(dl, false);
  for (const f of r.faces) {
    if (!f.bounds || !f.metadata) continue;
    recs++; fileSet.add(p);
    const rb = Buffer.from(dl.buffer, dl.byteOffset + f.geometryEnd, 132);
    const head = [rb.readUInt32LE(0), rb.readUInt32LE(4), rb.readUInt32LE(8)].join(',');
    hist[head] = (hist[head] || 0) + 1;
    const w = []; for (let o = 92; o < 132; o += 4) w.push(rb.readUInt32LE(o) === 0 ? '0' : rb.readUInt32LE(o) === 1 ? '1' : 'x');
    const sig = w.join(''); tuples[sig] = (tuples[sig] || 0) + 1;
    if (rb.readUInt32LE(104) === 1 && rb.readUInt32LE(108) === 1) { gated++; if (sample.length < 3) sample.push({ p, face: f.metadata.rawId, typeTag: f.metadata.typeTag, v: [rb.readFloatLE(116), rb.readFloatLE(120), rb.readFloatLE(124)], f112: rb.readFloatLE(112) }); }
  }
}
console.log(JSON.stringify({ records: recs, files: fileSet.size, headHist: hist, gated, tupleSigs: tuples, sample }, null, 1));
