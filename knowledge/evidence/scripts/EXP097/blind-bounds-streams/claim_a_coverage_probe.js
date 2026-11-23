// Coverage probe: why 740 native-matched gated cylinders, not 2,406. Splits gated records by display tag and native availability.
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern');
const partition = require(PKG + '/parasolid/partition'), zlib = require('zlib');
const ROOT = '/home/user/dump-validation', MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const files = [];
for (const d of ['test files original', 'test files new', 'test files online'])
  (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) files.push(q); } })(path.join(ROOT, d));
const cells = {}; const perFileNative = {};
const tally = (k) => (cells[k] = (cells[k] || 0) + 1);
for (const p of files.sort()) {
  const buf = fs.readFileSync(p);
  if (buf.subarray(4, 8).toString('hex') !== '00000004') continue;
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib); if (!dl) continue;
  const res = display.extractDisplayLists(dl, false);
  let parsed = null, nerr = null;
  try { parsed = partition.readBody(buf).parsed; if (parsed.error) { nerr = parsed.error; parsed = null; } } catch (e) { nerr = e.message; }
  const faces = new Map();
  if (parsed) { const idx = new Map(parsed.nodes.map(n => [n.index, n])); for (const n of parsed.nodes) if (n.type === 14) { const s = idx.get(n.values.surface); faces.set(n.values.node_id, s ? s.name : '?'); } }
  const dlBuf = Buffer.from(dl.buffer, dl.byteOffset, dl.byteLength);
  for (const f of res.faces) {
    if (!f.bounds || !f.metadata) continue;
    const rb = dlBuf.subarray(f.geometryEnd, f.geometryEnd + 132);
    const gate = rb.readUInt32LE(104) === 1 && rb.readUInt32LE(108) === 1;
    if (!gate) continue;
    const tag = f.metadata.typeTag;
    const nat = parsed ? (faces.has(f.metadata.rawId) ? faces.get(f.metadata.rawId) : 'id-not-found') : 'no-native:' + (nerr || '').slice(0, 30);
    tally(`tag=${tag} | native=${nat.startsWith('no-native') ? 'no-native' : nat}`);
  }
}
console.log(JSON.stringify(cells, null, 1));
