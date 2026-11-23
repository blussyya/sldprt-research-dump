'use strict';
// Step 1: read the bounds-record tail of every display face in every SLDPRT in the corpus into
// faces.jsonl, layout-aware. Record start = geometryEnd (modern) or after chainwheel's two extra
// arrays (legacy), the same place src/display.js reads its bounds.
//   lay A  (8,100,2) header at +132; B  same header at +140 (an extra f64 at +92); C  u32 1 at +132 then
//   (12,100,2) at +136 (2025/2026 saves); ole  legacy container; other  none of these.
// Words are read at the claim's literal offsets (u92 ... u128) and, as a second set (a92 ... a128),
// at the offsets shifted by +8 for layout B, so both readings can be checked.
// Per face also: tag, rawId, mesh-normal spread, an approximate smallest cone of the mesh normals,
// and, when a cone is stored, min over mesh normals of n.v.
// Usage: node dump.js > dump.out.txt
const fs = require('fs'), path = require('path');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const OUT = path.join(__dirname, 'faces.jsonl');
const { files, dups } = L.corpus();
const w = fs.createWriteStream(OUT);
let nFaces = 0;
const perFile = [];
for (const F of files) {
  const b = fs.readFileSync(F.path);
  const ole = sw.container.modern.isOLE2(b);
  let dl;
  try { dl = ole ? sw.container.ole.displayLists(b, sw.inflateZlib).bytes : sw.container.modern.findDisplayLists(b, sw.inflateRaw, sw.inflateZlib); }
  catch (e) { perFile.push({ rel: F.rel, ole, error: e.message }); continue; }
  if (!dl) { perFile.push({ rel: F.rel, ole, error: 'no DisplayLists' }); continue; }
  const d = sw.display.extractDisplayLists(dl, ole), dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  const meta = sw.parse(b); // for metadata (tag, rawId) on modern faces, matched by offset
  const byOff = new Map(meta.faces.map(f => [f.offset, f]));
  const lays = {};
  d.faces.forEach((f0, i) => {
    const f = byOff.get(f0.offset) || f0;
    const end = d.faces[i + 1] ? d.faces[i + 1].offset : dl.length;
    let at = f0.geometryEnd;
    if (ole && !f0.noEdgeTable) try {
      const h = o => [dv.getUint32(o, true), dv.getUint32(o + 4, true), dv.getUint32(o + 8, true), dv.getUint32(o + 12, true)];
      const a = h(at); if (a[0] === 12 && a[1] === 100 && a[2] === 2) { const ae = at + 16 + 12 * a[3], c = h(ae); if (c[0] === 8 && c[1] === 8 && c[2] === 2) at = ae + 16 + 8 * c[3]; }
    } catch (_) {}
    const U = o => at + o + 4 <= end ? dv.getUint32(at + o, true) : null, Fl = o => at + o + 4 <= end ? dv.getFloat32(at + o, true) : null;
    const hdr = (o, s) => U(o) === s && U(o + 4) === 100 && U(o + 8) === 2;
    const lay = ole ? (hdr(132, 8) ? 'oleA' : hdr(140, 8) ? 'oleB' : 'oleX') : hdr(132, 8) ? 'A' : hdr(140, 8) ? 'B' : (U(132) === 1 && hdr(136, 12)) ? 'C' : 'other';
    lays[lay] = (lays[lay] || 0) + 1;
    const sh = lay === 'B' || lay === 'oleB' ? 8 : 0;
    let own = null, ownErr = null;
    if (lay === 'B' || lay === 'C') try { own = L.idBlock(dv, at + 132 + sh, end, lay === 'B'); } catch (e) { ownErr = e.message; }
    // control for idBlock: on layout A it must give the converter's own tag and rawId
    let ctl = null;
    if (lay === 'A' && f.metadata) try { const x = L.idBlock(dv, at + 132, end, true); ctl = x.tag === f.metadata.typeTag && x.rawId === f.metadata.rawId; } catch (e) { ctl = false; }
    const row = { file: F.rel, ole, lay, i, off: f0.offset, at, recRoom: end - at, vc: f0.vertexCount,
      tag: f.metadata ? f.metadata.typeTag : own ? own.tag : null, rawId: f.metadata ? f.metadata.rawId : own ? own.rawId : null,
      tagFrom: f.metadata ? 'converter' : own ? 'idBlock' : null, metaErr: f.metadataError || null, ownErr, idBlockControl: ctl,
      boundsOk: !!f0.bounds };
    for (const o of [92, 96, 100, 104, 108, 112, 116, 120, 124, 128, 132]) { row['u' + o] = U(o); row['a' + o] = U(o + sh); }
    row.s = Fl(112 + sh); row.v = [Fl(116 + sh), Fl(120 + sh), Fl(124 + sh)];
    if (sh) row.f64at92 = dv.getFloat64(at + 92, true);
    const ns = L.normalsOf(f0).map(L.unit);
    const uniq = [...new Map(ns.map(n => [n.map(x => x.toFixed(6)).join(','), n])).values()];
    const spread = L.spread(uniq);
    row.spreadDeg = L.deg(spread); row.nUniqNormals = uniq.length;
    if (spread > 1e-6) { const c = L.minCone(uniq); row.mcAxis = c.axis; row.mcCos = c.cos; row.mcDeg = L.deg(Math.acos(Math.min(1, c.cos))); }
    if (row.a104 === 1 && row.a108 === 1) {
      const v = row.v, vu = L.unit(v);
      let mn = 2; for (const n of uniq) mn = Math.min(mn, L.dot(n, vu));
      row.vLen = L.norm(v); row.minDotV = mn;
      const m = L.unit(ns.reduce((s, n) => [s[0] + n[0], s[1] + n[1], s[2] + n[2]], [0, 0, 0]));
      row.angVMean = L.deg(Math.acos(Math.max(-1, Math.min(1, L.dot(m, vu)))));
      if (row.mcAxis) row.angVMinCone = L.deg(Math.acos(Math.max(-1, Math.min(1, L.dot(row.mcAxis, vu)))));
    }
    w.write(JSON.stringify(row) + '\n'); nFaces++;
  });
  perFile.push({ rel: F.rel, ole, faces: d.faces.length, lays });
}
w.end();
console.log('files (deduplicated by sha1):', files.length, 'duplicates skipped:', dups.length);
for (const [a, b] of dups) console.log('  dup', path.relative(L.ROOT, a), '==', path.relative(L.ROOT, b));
console.log('faces written:', nFaces);
for (const p of perFile) console.log(JSON.stringify(p));
