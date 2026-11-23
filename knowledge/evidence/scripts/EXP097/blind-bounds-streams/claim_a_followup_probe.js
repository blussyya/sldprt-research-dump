// Follow-up probe for claim A controls: (1) the 305 ungated native cylinders that are perpendicular to their axis;
// (2) whether the display surface record's axis (metadata.direction) agrees with the native axis on the 740 matches.
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern');
const partition = require(PKG + '/parasolid/partition'), zlib = require('zlib');
const ROOT = '/home/user/dump-validation', MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => { const n = norm(a); return a.map(x => x / n); };
const files = [];
for (const d of ['test files original', 'test files new', 'test files online'])
  (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) files.push(q); } })(path.join(ROOT, d));
const perp = { n: 0, byFlags: {}, normBuckets: {}, examples: [] }, agree = { n: 0, agree: 0, disagree: [] };
for (const p of files.sort()) {
  const buf = fs.readFileSync(p);
  if (buf.subarray(4, 8).toString('hex') !== '00000004') continue;
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib); if (!dl) continue;
  const res = display.extractDisplayLists(dl, false); const dlBuf = Buffer.from(dl.buffer, dl.byteOffset, dl.byteLength);
  let parsed = null; try { parsed = partition.readBody(buf).parsed; if (parsed.error) parsed = null; } catch (e) { parsed = null; }
  if (!parsed) continue;
  const idx = new Map(parsed.nodes.map(n => [n.index, n])); const nat = new Map();
  for (const n of parsed.nodes) if (n.type === 14) { const s = idx.get(n.values.surface); if (s && s.name === 'CYLINDER') nat.set(n.values.node_id, s.values); }
  for (const f of res.faces) {
    if (!f.bounds || !f.metadata) continue;
    const rb = dlBuf.subarray(f.geometryEnd, f.geometryEnd + 132);
    const gate = rb.readUInt32LE(104) === 1 && rb.readUInt32LE(108) === 1;
    const cyl = nat.get(f.metadata.rawId); if (!cyl) continue;
    const ax = unit(cyl.axis), vec = [rb.readFloatLE(116), rb.readFloatLE(120), rb.readFloatLE(124)], n = norm(vec);
    if (f.metadata.direction && norm(f.metadata.direction) > 0) { agree.n++; const c = Math.abs(dot(unit(f.metadata.direction), ax)); if (c > 1 - 1e-6) agree.agree++; else agree.disagree.push({ file: path.relative(ROOT, p), id: f.metadata.rawId, c }); }
    if (gate) continue;
    const c = Math.abs(dot(vec, ax)) / n;
    if (n > 0 && c <= 2.83e-8) {
      perp.n++;
      const fk = `u104=${rb.readUInt32LE(104)} u108=${rb.readUInt32LE(108)} u92=${rb.readUInt32LE(92)} u96=${rb.readUInt32LE(96)}`;
      perp.byFlags[fk] = (perp.byFlags[fk] || 0) + 1;
      const b = n < 0.5 ? '<0.5' : n < 0.9 ? '0.5-0.9' : n < 0.999 ? '0.9-0.999' : n < 1.001 ? '1+-0.001' : '>1.001';
      perp.normBuckets[b] = (perp.normBuckets[b] || 0) + 1;
      if (perp.examples.length < 4) perp.examples.push({ file: path.relative(ROOT, p), id: f.metadata.rawId, vec, norm: n, axis: ax, floats112: rb.readFloatLE(112) });
    }
  }
}
console.log(JSON.stringify({ ungatedPerpendicularCylinders: perp.n, byFlags: perp.byFlags, normBuckets: perp.normBuckets, examples: perp.examples }, null, 1));
console.log(JSON.stringify({ displayDirectionVsNativeAxis: { n: agree.n, parallelWithin1e6: agree.agree, disagreeSample: agree.disagree.slice(0, 5) } }, null, 1));
