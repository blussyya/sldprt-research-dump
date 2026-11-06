// Coverage probe 2: search every partition-bearing stream and every section for the display faces' Parasolid
// FACE node_ids, to see whether the 1,616 unmatched gated tag-4002 faces live in another section.
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern');
const partition = require(PKG + '/parasolid/partition'), xt = require(PKG + '/parasolid/xt'), zlib = require('zlib');
const ROOT = '/home/user/dump-validation', MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const files = [];
for (const d of ['test files original', 'test files new', 'test files online'])
  (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) files.push(q); } })(path.join(ROOT, d));
const tally = {}; const t = k => (tally[k] = (tally[k] || 0) + 1);
const perFile = [];
for (const p of files.sort()) {
  const buf = fs.readFileSync(p);
  if (buf.subarray(4, 8).toString('hex') !== '00000004') continue;
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib); if (!dl) continue;
  const res = display.extractDisplayLists(dl, false);
  const dlBuf = Buffer.from(dl.buffer, dl.byteOffset, dl.byteLength);
  const want = [];
  for (const f of res.faces) {
    if (!f.bounds || !f.metadata) continue;
    const rb = dlBuf.subarray(f.geometryEnd, f.geometryEnd + 132);
    if (rb.readUInt32LE(104) === 1 && rb.readUInt32LE(108) === 1) want.push({ id: f.metadata.rawId, tag: f.metadata.typeTag });
  }
  if (!want.length) continue;
  // all sections of all GUID-bearing streams
  const streams = partition.streams(buf); const found = new Map(); // id -> Set of surface names
  let sectionsParsed = 0, sectionsFailed = 0;
  for (const [name, b] of Object.entries(streams)) {
    const g = b.indexOf(partition.GUID); if (g < 4) continue;
    const secs = partition.sections(b, g - 4).out;
    for (const s of secs) {
      let parsed; try { parsed = xt.parse(s.body, true); } catch (e) { sectionsFailed++; continue; }
      sectionsParsed++;
      const idx = new Map(parsed.nodes.map(n => [n.index, n]));
      for (const n of parsed.nodes) if (n.type === 14) {
        const sn = idx.get(n.values.surface); const nm = sn ? sn.name : '?';
        if (!found.has(n.values.node_id)) found.set(n.values.node_id, new Set());
        found.get(n.values.node_id).add(nm);
      }
    }
  }
  let matchedCyl = 0, conflicts = 0, missing = 0, nonCylMatch = 0;
  for (const w of want) {
    const s = found.get(w.id);
    if (!s) { missing++; continue; }
    if (s.size > 1) { conflicts++; continue; }
    const nm = [...s][0];
    if (nm === 'CYLINDER') matchedCyl++; else nonCylMatch++;
  }
  perFile.push({ file: path.relative(ROOT, p), want: want.length, sectionsParsed, sectionsFailed, matchedCyl, nonCylMatch, missing, conflicts, wantTag4002: want.filter(w => w.tag === 4002).length });
}
const sum = k => perFile.reduce((a, r) => a + r[k], 0);
console.log(JSON.stringify({ files: perFile.length, gatedRecords: sum('want'), gatedTag4002: sum('wantTag4002'), matchedCylinder: sum('matchedCyl'), matchedNonCylinder: sum('nonCylMatch'), missing: sum('missing'), conflicts: sum('conflicts'), sectionsParsed: sum('sectionsParsed'), sectionsFailed: sum('sectionsFailed') }, null, 1));
console.log(JSON.stringify(perFile.filter(r => r.missing > 0).slice(0, 12), null, 0));
