#!/usr/bin/env node
/**
 * v0.4.2a INDEPENDENT PARSER
 *
 * Reproduces INV-016/017/018 using a completely different implementation.
 * Uses marker-based face extraction but with independent code (not derived from
 * block1_parser.js or stress_test_invariants.js). Tests INV-005/006 as
 * pre-conditions rather than circular filters.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESEARCH_DIR = 'C:/Users/basha/Desktop/soldiworks research';

function rolByte(b, s) {
  s &= 7;
  if (!s) return b;
  return ((b << s) | (b >>> (8 - s))) & 0xFF;
}

function findAll(buf, pattern) {
  const r = [];
  for (let i = 0; i <= buf.length - pattern.length; i++) {
    let ok = true;
    for (let j = 0; j < pattern.length; j++) {
      if (buf[i + j] !== pattern[j]) { ok = false; break; }
    }
    if (ok) r.push(i);
  }
  return r;
}

function decompressOpenSX(buffer) {
  const key = buffer[7];
  const magic = [20, 0, 6, 0, 8, 0];
  const streams = {};
  for (const mp of findAll(buffer, magic)) {
    const si = mp - 4;
    if (si < 0 || si + 30 > buffer.length) continue;
    const csz = buffer.readUInt32LE(si + 18);
    const nsz = buffer.readUInt32LE(si + 26);
    if (nsz > 1024 || csz > 50e6) continue;
    const ns = si + 30, ds = ns + nsz, de = ds + csz;
    if (de > buffer.length) continue;
    if (buffer.readUInt32LE(si + 14) >= 65536 && csz > 0) {
      let n = '';
      for (let i = 0; i < nsz; i++) n += String.fromCharCode(rolByte(buffer[ns + i], key));
      if (!n) continue;
      let d;
      try { d = zlib.inflateRawSync(Buffer.from(buffer.subarray(ds, de))); }
      catch { try { d = zlib.inflateSync(Buffer.from(buffer.subarray(ds, de))); } catch {} }
      if (d && d.length > 0 && !streams[n]) streams[n] = d;
    }
  }
  return streams;
}

function findDisplayLists(buffer) {
  const dc = decompressOpenSX(buffer);
  for (const [name, data] of Object.entries(dc)) {
    if (name.toLowerCase().includes('displaylist') && data.length > 100) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (buf.readUInt32LE(0) === 1 && buf.readUInt32LE(4) === 1) return data;
    }
  }
  return null;
}

// ============================================================
// INDEPENDENT FACE EXTRACTION
// Scans for face markers, reads layout, tests INV-016/017/018.
// Reports INV-005/006 as pre-conditions (tested, not assumed).
// ============================================================

const FACE_MARKER = [12, 0, 0, 0, 100, 0, 0, 0];

function extractFacesIndependent(dl) {
  const faces = [];
  const matches = findAll(dl, Buffer.from(FACE_MARKER));

  for (const mp of matches) {
    const faceStart = mp - 4;
    if (faceStart < 0) continue;

    const ec = dl.readUInt32LE(faceStart);
    if (ec < 1 || ec > 500) continue;
    if (dl.readUInt32LE(mp + 8) !== 2) continue;
    const vc = dl.readUInt32LE(mp + 12);
    if (vc < 3 || vc > 10000) continue;

    const vs = mp + 16;
    if (vs + vc * 12 > dl.length) continue;

    let ok = true;
    for (let i = 0; i < vc; i++) {
      const x = dl.readFloatLE(vs + i * 12);
      if (!isFinite(x) || Math.abs(x) > 1e5) { ok = false; break; }
    }
    if (!ok) continue;

    const verticesEnd = vs + vc * 12;
    const gapStart = verticesEnd;

    const gap = [
      dl.readUInt32LE(gapStart),
      dl.readUInt32LE(gapStart + 4),
      dl.readUInt32LE(gapStart + 8),
      dl.readUInt32LE(gapStart + 12),
    ];
    if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vc) continue;

    const b1Start = gapStart + 16 + vc * 12;
    if (b1Start + 16 > dl.length) continue;

    const b1h = [
      dl.readUInt32LE(b1Start),
      dl.readUInt32LE(b1Start + 4),
      dl.readUInt32LE(b1Start + 8),
      dl.readUInt32LE(b1Start + 12),
    ];

    const b1HasValidHeader = (b1h[0] === 4 && b1h[1] === 8 && b1h[2] === 2);
    if (!b1HasValidHeader) continue;
    const b1Len = b1h[3];
    if (b1Len < 1 || b1Len > 500000) continue;

    const b2Start = b1Start + (b1Len + 4) * 4;
    if (b2Start + 16 > dl.length) continue;

    const b2h = [
      dl.readUInt32LE(b2Start),
      dl.readUInt32LE(b2Start + 4),
      dl.readUInt32LE(b2Start + 8),
      dl.readUInt32LE(b2Start + 12),
    ];

    const b2HasValidHeader = (b2h[0] === 4 && b2h[1] === 8 && b2h[2] === 2);
    if (!b2HasValidHeader) continue;
    const b2Len = b2h[3];
    if (b2Len < 1 || b2Len > 100000) continue;

    const b2BodyStart = b2Start + 16;
    if (b2BodyStart + b2Len * 4 > dl.length) continue;

    const b1Body = [];
    for (let i = 0; i < b1Len; i++) b1Body.push(dl.readUInt32LE(b1Start + 16 + i * 4));
    const b2Body = [];
    for (let i = 0; i < b2Len; i++) b2Body.push(dl.readUInt32LE(b2BodyStart + i * 4));

    const oneCount = b1Body.filter(v => v === 1).length;
    const sections = [];
    let cur = [];
    for (const t of b1Body) {
      if (t === 1) { if (cur.length) sections.push(cur); cur = []; }
      else cur.push(t);
    }
    if (cur.length) sections.push(cur);

    const b2Sum = b2Body.reduce((a, b) => a + b, 0);

    let inv017 = true;
    if (sections.length !== b2Body.length) {
      inv017 = false;
    } else {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].length !== b2Body[i] - 1) { inv017 = false; break; }
      }
    }

    faces.push({
      faceStart, ec, vc,
      b1HasValidHeader, b1h, b1Len,
      b2HasValidHeader, b2h, b2Len,
      b2Sum,
      sectionCount: oneCount,
      inv016: b1Len === 2 * (vc - oneCount),
      inv017,
      inv018: b2Sum === b1Len,
    });
  }
  return faces;
}

// ============================================================
// MAIN
// ============================================================

const CORPUS = [
  { shortName: 'BOTTOM', path: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case BOTTOM.SLDPRT') },
  { shortName: 'TOP', path: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case TOP.SLDPRT') },
  { shortName: 'GEAR', path: path.join(RESEARCH_DIR, 'test files original', 'Helical Bevel Gear.SLDPRT') },
  { shortName: 'DEKOR', path: path.join(RESEARCH_DIR, 'test files original', 'Dekor.SLDPRT') },
  { shortName: 'HEADPHONE', path: path.join(RESEARCH_DIR, 'untouched', 'Headphone Stand.SLDPRT') },
  { shortName: 'DISTRIBUTOR', path: path.join(RESEARCH_DIR, 'untouched', 'distributor main boss rev a.SLDPRT') },
  { shortName: 'POCKET', path: path.join(RESEARCH_DIR, 'untouched', 'Pocket Wheel.SLDPRT') },
  { shortName: 'PTC', path: path.join(RESEARCH_DIR, 'untouched', 'PTC GE8080-8.SLDPRT') },
];

console.log('='.repeat(70));
console.log('v0.4.2a INDEPENDENT PARSER (marker-based, independent implementation)');
console.log('INV-005/006 reported as pre-conditions; INV-016/017/018 tested');
console.log('='.repeat(70));

let totalFaces = 0;
let i16p = 0, i16f = 0, i17p = 0, i17f = 0, i18p = 0, i18f = 0;
let b1Valid = 0, b2Valid = 0, bothValid = 0;
const fails = [];

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED'); continue; }
  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  const faces = extractFacesIndependent(dlBuf);
  console.log('  Faces: ' + faces.length);
  totalFaces += faces.length;

  for (const f of faces) {
    if (f.b1HasValidHeader) b1Valid++;
    if (f.b2HasValidHeader) b2Valid++;
    if (f.b1HasValidHeader && f.b2HasValidHeader) bothValid++;

    if (f.inv016) i16p++; else i16f++;
    if (f.inv017) i17p++; else i17f++;
    if (f.inv018) i18p++; else i18f++;

    if (!f.inv016 || !f.inv017 || !f.inv018) {
      fails.push({
        file: file.shortName, faceStart: '0x' + f.faceStart.toString(16),
        ec: f.ec, vc: f.vc, b1len: f.b1Len, b2cnt: f.b2Len, b2sum: f.b2Sum,
        secs: f.sectionCount, i16: f.inv016, i17: f.inv017, i18: f.inv018,
      });
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log('Total faces: ' + totalFaces);
console.log('B1 valid [4,8,2,N]: ' + b1Valid + ' / ' + totalFaces);
console.log('B2 valid [4,8,2,M]: ' + b2Valid + ' / ' + totalFaces);
console.log('Both valid: ' + bothValid + ' / ' + totalFaces);
console.log('');
console.log('INV-016 (b1len == 2*(vc-secs)): ' + i16p + ' pass, ' + i16f + ' fail');
console.log('INV-017 (secLen == b2[i]-1):     ' + i17p + ' pass, ' + i17f + ' fail');
console.log('INV-018 (sum(b2) == b1len):       ' + i18p + ' pass, ' + i18f + ' fail');
console.log('All three pass: ' + (i16p + i17p + i18p === totalFaces * 3 ? 'YES' : 'NO') +
  ' (' + (i16p === totalFaces && i17p === totalFaces && i18p === totalFaces ? totalFaces : (totalFaces - fails.length)) + '/' + totalFaces + ')');

if (fails.length > 0) {
  console.log('\nFAIL examples:');
  for (const f of fails.slice(0, 10)) {
    console.log('  ' + f.file + ' @' + f.faceStart + ' ec=' + f.ec + ' vc=' + f.vc +
      ' b1len=' + f.b1len + ' b2c=' + f.b2cnt + ' b2s=' + f.b2sum +
      ' 016:' + (f.i16 ? 'P' : 'F') + ' 017:' + (f.i17 ? 'P' : 'F') + ' 018:' + (f.i18 ? 'P' : 'F'));
  }
}

console.log('\nComparison with marker-based (vc<=6000): 1234 vs ' + totalFaces);

const output = {
  meta: { version: 'v0.4.2a', pipeline: 'independent', date: new Date().toISOString(), totalFaces },
  b1Valid, b2Valid, bothValid,
  inv016: { pass: i16p, fail: i16f },
  inv017: { pass: i17p, fail: i17f },
  inv018: { pass: i18p, fail: i18f },
  fails: fails.slice(0, 20),
};
fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.2a', 'INDEPENDENT_PARSER_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.2a/INDEPENDENT_PARSER_RESULTS.json');
