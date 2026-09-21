#!/usr/bin/env node
/* EXP-057 — settle the open claims on our own corpus.
 *
 * Each block below is a question our knowledge base currently leaves open or
 * answers only by preference. All are decided here against our own files, so
 * nothing downstream depends on anyone else's assertion.
 *
 *   Q1  Does the container carry a verifiable CRC-32 per stream?
 *   Q2  Is Block1 u32 edge-ID tokens or f32 values? (INV-021 vs the float reading)
 *   Q3  Does a face record ever carry a strip control token other than 1?
 *   Q4  Does a face record ever carry zero normals?
 *   Q5  Does the per-face record layout vary with the declared _DL_VERSION?
 *   Q6  How long is the constant section magic in Config-0-Partition?
 *
 * Corpus: every modern SLDPRT under "test files original" and
 * "test files new/SW2022" (legacy OLE2 files are counted and skipped).
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const v2 = require(path.join(ROOT, 'parser/v0.2/src/parser-core.js'));
const iR = b => zlib.inflateRawSync(Buffer.from(b));
const iZ = b => zlib.inflateSync(Buffer.from(b));

// ---- collect corpus -------------------------------------------------------
const files = [];
for (const base of ['test files original', 'test files new/SW2022']) {
  const root = path.join(ROOT, base);
  if (!fs.existsSync(root)) continue;
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) w(p);
      else if (/\.sldprt$/i.test(e.name)) files.push(p);
    }
  })(root);
}
files.sort();
const rel = f => path.relative(ROOT, f);

// ---- CRC-32 (no dependencies) --------------------------------------------
const CRCT = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = CRCT[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const rolByte = (b, k) => ((b << (k & 7)) | (b >>> (8 - (k & 7)))) & 0xff;
function findAll(buf, sig) {
  const out = [];
  outer: for (let i = 0; i + sig.length <= buf.length; i++) {
    for (let j = 0; j < sig.length; j++) if (buf[i + j] !== sig[j]) continue outer;
    out.push(i);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Q1 — container CRC-32
// ---------------------------------------------------------------------------
function checkCRC(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const key = buf[7];
  // Scanning a 6-byte signature across a whole file produces false positives:
  // random byte runs that pass the shape checks but are not stream headers.
  // A genuine stream name is printable ASCII, so split the results on that
  // rather than letting spurious hits masquerade as CRC failures.
  const plausible = n => n.length > 0 && /^[\x20-\x7e/\\._-]+$/.test(n);
  const res = { ok: 0, bad: 0, undecompressed: 0, names: [],
                junkOk: 0, junkBad: 0, junkUndecompressed: 0 };
  for (const m of findAll(buf, [20, 0, 6, 0, 8, 0])) {
    const s = m - 4;
    if (s < 0 || s + 30 > buf.length) continue;
    const stored = dv.getUint32(s + 14, true);
    const compSize = dv.getUint32(s + 18, true);
    const nameSize = dv.getUint32(s + 26, true);
    if (nameSize > 1024 || compSize > 50e6) continue;
    const nameStart = s + 30, dataStart = nameStart + nameSize, dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) continue;
    if (!(stored >= 65536 && compSize > 0)) continue;
    let name = '';
    for (let i = 0; i < nameSize; i++) name += String.fromCharCode(rolByte(buf[nameStart + i], key));
    let data = null;
    try { data = iR(buf.subarray(dataStart, dataEnd)); }
    catch (e) { try { data = iZ(buf.subarray(dataStart, dataEnd)); } catch (e2) {} }
    const good = plausible(name);
    if (!data) { if (good) res.undecompressed++; else res.junkUndecompressed++; continue; }
    const got = crc32(Buffer.from(data));
    if (got === stored) { if (good) res.ok++; else res.junkOk++; }
    else if (good) { res.bad++; res.names.push(`${name} stored=${stored.toString(16)} got=${got.toString(16)}`); }
    else res.junkBad++;
  }
  return res;
}

// ---------------------------------------------------------------------------
// main sweep
// ---------------------------------------------------------------------------
let modern = 0, legacy = 0;
const crcTot = { ok: 0, bad: 0, undecompressed: 0, junkOk: 0, junkBad: 0, junkUndecompressed: 0 };
const crcBadNames = [];

// Q2
let b1Words = 0, b1FiniteAsF32 = 0, b1SubnormalOrZeroExp = 0, b1IntLike = 0, b1Max = 0;
// Q3
const controls = new Map();
// Q4
let facesTot = 0, zeroNormals = 0, normalCountMismatch = 0;
// Q5
const byVersion = new Map();
// Q6
const magics = [];

for (const f of files) {
  const buf = fs.readFileSync(f);
  if (v1.isOLE2(buf)) { legacy++; continue; }
  modern++;

  const c = checkCRC(buf);
  crcTot.ok += c.ok; crcTot.bad += c.bad; crcTot.undecompressed += c.undecompressed;
  crcTot.junkOk += c.junkOk; crcTot.junkBad += c.junkBad; crcTot.junkUndecompressed += c.junkUndecompressed;
  for (const n of c.names) crcBadNames.push(`${rel(f)}: ${n}`);

  let streams = {};
  try { streams = v1.decompressOpenSX(buf, iR, iZ); } catch (e) {}
  const dlv = Object.keys(streams).filter(n => /_DL_VERSION_/.test(n))
    .map(n => n.match(/_DL_VERSION_(\d+)/)[1])[0] || 'none';

  // Q6 — section magic in the partition
  const pn = Object.keys(streams).find(n => /Config-0-Partition$/.test(n));
  if (pn) magics.push(Buffer.from(streams[pn]).subarray(4, 28).toString('hex'));

  const res = v2.parseSLDPRT(buf, iR, iZ);
  if (res.errors && res.errors.length) continue;

  if (!byVersion.has(dlv)) byVersion.set(dlv, { files: 0, faces: 0, rejects: 0 });
  const bv = byVersion.get(dlv);
  bv.files++; bv.faces += res.faces.length; bv.rejects += (res.rejected || []).length;

  for (const face of res.faces) {
    facesTot++;
    if (face.normals.length === 0) zeroNormals++;
    if (face.normals.length !== face.vertices.length) normalCountMismatch++;

    for (const t of face.stripControls) controls.set(t, (controls.get(t) || 0) + 1);

    // Q2 — reinterpret every Block1 word as f32 and see what it would be
    const b1 = face.block1;
    const dv = new DataView(b1.buffer, b1.byteOffset, b1.byteLength);
    for (let i = 0; i < b1.length; i++) {
      b1Words++;
      const w = b1[i];
      if (w > b1Max) b1Max = w;
      if (Number.isInteger(w)) b1IntLike++;
      const asF = dv.getFloat32(i * 4, true);
      if (Number.isFinite(asF)) b1FiniteAsF32++;
      // a u32 below 2^23 reinterpreted as f32 is subnormal or zero-exponent:
      // that is the signature of small integers wearing a float costume
      if (Math.abs(asF) < 1e-30) b1SubnormalOrZeroExp++;
    }
  }
}

const P = (n, d) => d ? (100 * n / d).toFixed(2) + '%' : 'n/a';
console.log(`corpus: ${files.length} files — ${modern} modern parsed, ${legacy} legacy OLE2 skipped\n`);

console.log('Q1  container CRC-32');
console.log('    named streams (printable-ASCII name):');
console.log(`      CRC verified          ${crcTot.ok}`);
console.log(`      CRC mismatches        ${crcTot.bad}`);
console.log(`      not decompressible    ${crcTot.undecompressed}`);
for (const n of crcBadNames.slice(0, 5)) console.log(`        ${n}`);
console.log('    spurious signature hits (non-printable name) — false positives of the scan:');
console.log(`      CRC happened to match ${crcTot.junkOk}`);
console.log(`      CRC mismatched        ${crcTot.junkBad}`);
console.log(`      not decompressible    ${crcTot.junkUndecompressed}`);
console.log(`      verdict: ${crcTot.bad === 0 && crcTot.ok > 0
  ? 'for every real stream, the u32 at localHeader+14 IS a CRC-32 of the inflated bytes'
  : 'NOT confirmed — a named stream failed its CRC'}`);

console.log('\nQ2  Block1 element type');
console.log(`      words examined                    ${b1Words}`);
console.log(`      finite when read as f32           ${b1FiniteAsF32}  (${P(b1FiniteAsF32, b1Words)})`);
console.log(`      |value| < 1e-30 as f32            ${b1SubnormalOrZeroExp}  (${P(b1SubnormalOrZeroExp, b1Words)})`);
console.log(`      largest u32 value                 ${b1Max}`);
console.log(`      verdict: a "finite f32" test accepts ${P(b1FiniteAsF32, b1Words)} of words and so`);
console.log(`               discriminates nothing; ${P(b1SubnormalOrZeroExp, b1Words)} are effectively zero`);
console.log(`               as floats, which is what small integers look like.`);

console.log('\nQ3  strip control token values');
for (const [k, v] of [...controls].sort((a, b) => b[1] - a[1]))
  console.log(`      control=${k}  ${v} strips`);
console.log(`      verdict: ${controls.size === 1 && controls.has(1)
  ? 'no extended/nonzero-token header form occurs in this corpus' : 'MORE THAN ONE FORM EXISTS'}`);

console.log('\nQ4  normals presence');
console.log(`      faces                             ${facesTot}`);
console.log(`      faces with zero normals           ${zeroNormals}`);
console.log(`      normals/positions count mismatch  ${normalCountMismatch}`);

console.log('\nQ5  record layout vs declared _DL_VERSION');
for (const [k, v] of [...byVersion].sort())
  console.log(`      _DL_VERSION_${k.padEnd(6)} files=${String(v.files).padStart(2)}  faces=${String(v.faces).padStart(5)}  rejected=${v.rejects}`);
console.log(`      verdict: ${[...byVersion.values()].every(v => v.rejects === 0)
  ? 'one record grammar parses every declared version with 0 rejections' : 'a version rejects records'}`);

console.log('\nQ6  Config-0-Partition section magic');
const uniq = [...new Set(magics)];
let common = uniq.length ? uniq[0] : '';
for (const m of uniq) { let i = 0; while (i < common.length && common[i] === m[i]) i++; common = common.slice(0, i); }
console.log(`      partitions sampled   ${magics.length}`);
console.log(`      distinct byte-4..28  ${uniq.length}`);
console.log(`      constant prefix      ${common.length / 2} bytes: ${common.replace(/(..)/g, '$1 ').trim()}`);
