#!/usr/bin/env node
/* EXP-064 / NQ-045 — is the INV-026 bounding record present in the legacy
 * SolidWorks 2011 OLE2 container?
 *
 * The legacy geometry stream is DisplayLists__ZLB (EXP-060), and our
 * DisplayLists parser does not read legacy files at all. So this probe uses no
 * parser and no walker: it extracts the stream, inflates it, and applies the
 * same walker-free arithmetic scan used on the modern corpus. Selection is by
 * the two identities plus a radius floor; ORDERING IS NOT A SELECTION CRITERION,
 * so min <= max remains a real test rather than an artefact.
 *
 * The legacy corpus is geometry-matched to the modern one (same C-numbers, same
 * nominal dimensions), which is what makes this decisive: the boxes are known in
 * advance. C00 is a 10 mm cube at the origin, so a correct decode must produce
 * [0,0.01] on every axis, in metres.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const X = require(path.join(ROOT, 'v0.3.2/src/sldprt-extractor.js'));
const { scan } = require('./rawscan-bounds.js');

function readBig(buf, ole, start, size) {
  const ss = ole.ss, out = []; let s = start, g = 0;
  while (s >= 0 && s < 0xFFFFFFFA && g < size) { out.push(buf.subarray((s + 1) * ss, (s + 1) * ss + ss)); g += ss; s = ole.fat[s]; }
  return Buffer.concat(out).subarray(0, size);
}
function readStream(buf, ole, e) {
  if (e.size >= ole.miniCutoff) return readBig(buf, ole, e.startSector, e.size);
  const root = ole.rootEntry || ole.entries[0];
  const big = readBig(buf, ole, root.startSector, root.size);
  const mfat = []; let sec = ole.miniFatStartSec;
  while (sec >= 0 && sec < 0xFFFFFFFA) {
    const off = (sec + 1) * ole.ss;
    for (let i = 0; i < ole.ss; i += 4) mfat.push(buf.readUInt32LE(off + i));
    sec = ole.fat[sec];
  }
  const out = []; let s = e.startSector, g = 0;
  while (s >= 0 && s < 0xFFFFFFFA && g < e.size) { out.push(big.subarray(s * 64, s * 64 + 64)); g += 64; s = mfat[s]; }
  return Buffer.concat(out).subarray(0, e.size);
}

/* The stream is named ..._ZLB and is not raw payload: find the zlib member. */
function inflateAnywhere(raw) {
  for (let i = 0; i < Math.min(raw.length - 2, 4096); i++)
    if (raw[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(raw[i + 1])) {
      try { const o = zlib.inflateSync(raw.subarray(i)); if (o.length > 64) return { buf: o, at: i }; } catch (e) { }
    }
  // Some members are truncated/streamed; retry tolerantly.
  for (let i = 0; i < Math.min(raw.length - 2, 4096); i++)
    if (raw[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(raw[i + 1])) {
      try {
        const o = zlib.inflateSync(raw.subarray(i), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
        if (o.length > 64) return { buf: o, at: i, partial: true };
      } catch (e) { }
    }
  return null;
}

const B = path.join(ROOT, 'test files new/SW2011');
const MODERN = path.join(ROOT, 'test files new/SW2022');
let n = 0, gotStream = 0, gotInflate = 0, withRecords = 0, totalRecs = 0, ordered = 0;
const rows = [];
for (const d of fs.readdirSync(B).sort()) {
  const dir = path.join(B, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  const f = path.join(dir, 'model.SLDPRT');
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  if (buf.subarray(0, 4).toString('hex') !== 'd0cf11e0') continue;
  n++;
  const ole = X.parseOLE2(buf);
  const e = ole.entries.find(x => /^DisplayLists/.test(x.name));
  if (!e) { rows.push({ d, note: 'no DisplayLists stream' }); continue; }
  gotStream++;
  const raw = readStream(buf, ole, e);
  const inf = inflateAnywhere(raw);
  if (!inf) { rows.push({ d, note: `stream ${e.name} ${raw.length}B, no inflate` }); continue; }
  gotInflate++;
  const hits = scan(inf.buf);
  totalRecs += hits.length;
  ordered += hits.filter(h => h.ordered).length;
  if (hits.length) withRecords++;
  const mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (const h of hits) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], h.B[a]); mx[a] = Math.max(mx[a], h.A[a]); }
  rows.push({ d, stream: e.name, raw: raw.length, inf: inf.buf.length, recs: hits.length, mn, mx });
}

console.log(`SolidWorks 2011 OLE2 files              ${n}`);
console.log(`  DisplayLists stream located           ${gotStream}/${n}`);
console.log(`  stream inflated                       ${gotInflate}/${n}`);
console.log(`  files yielding >=1 bounding record    ${withRecords}/${n}`);
console.log(`  bounding records found                ${totalRecs}`);
console.log(`  of which min <= max on all axes       ${ordered}/${totalRecs}`);
console.log('\nper model (union of decoded boxes, metres):');
for (const r of rows) {
  if (r.note) { console.log(`  ${r.d.padEnd(30)} ${r.note}`); continue; }
  console.log(`  ${r.d.padEnd(30)} ${String(r.recs).padStart(4)} recs  ` +
    (r.recs ? `min[${r.mn.map(x => x.toFixed(6)).join(' ')}] max[${r.mx.map(x => x.toFixed(6)).join(' ')}]` : ''));
}

/* Ground-truth control: the same model in both eras must give the same box. */
console.log('\nlegacy vs modern box, geometry-matched models:');
let cmp = 0, agree = 0;
for (const r of rows) {
  if (!r.recs) continue;
  const md = path.join(MODERN, r.d, 'model.SLDPRT');
  if (!fs.existsSync(md)) continue;
  const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
  const iR = b => zlib.inflateRawSync(Buffer.from(b)), iZ = b => zlib.inflateSync(Buffer.from(b));
  let dl; try { dl = Buffer.from(v1.findDisplayLists(fs.readFileSync(md), iR, iZ)); } catch (err) { continue; }
  const h2 = scan(dl);
  if (!h2.length) continue;
  const mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (const h of h2) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], h.B[a]); mx[a] = Math.max(mx[a], h.A[a]); }
  cmp++;
  const same = [0, 1, 2].every(a => Math.abs(mn[a] - r.mn[a]) < 1e-6 && Math.abs(mx[a] - r.mx[a]) < 1e-6);
  if (same) agree++; else console.log(`  DIFFER ${r.d}: legacy min[${r.mn.map(x => x.toFixed(6))}] modern min[${mn.map(x => x.toFixed(6))}]`);
}
console.log(`  models comparable                     ${cmp}`);
console.log(`  legacy box == modern box (1e-6 m)     ${agree}/${cmp}`);
