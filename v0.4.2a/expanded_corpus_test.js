#!/usr/bin/env node
/**
 * v0.4.2a EXPANDED CORPUS TEST
 * Changes from v0.4.2:
 *   1. vc limit raised from 5000 to 6000 (includes 2 DEKOR vc=5862 faces)
 *   2. Logs every vc>5000 face as a special observation
 *   3. Verifies all invariants hold on the expanded corpus
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
  const matches = findAll(buffer, magic);
  for (const matchPos of matches) {
    const sigStart = matchPos - 4;
    if (sigStart < 0 || sigStart + 30 > buffer.length) continue;
    const compSize = buffer.readUInt32LE(sigStart + 18);
    const nameSize = buffer.readUInt32LE(sigStart + 26);
    if (nameSize > 1024 || compSize > 50e6) continue;
    const nameStart = sigStart + 30;
    const dataStart = nameStart + nameSize;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buffer.length) continue;
    if (buffer.readUInt32LE(sigStart + 14) >= 65536 && compSize > 0) {
      let name = '';
      for (let i = 0; i < nameSize; i++) name += String.fromCharCode(rolByte(buffer[nameStart + i], key));
      if (!name) continue;
      let data;
      try { data = zlib.inflateRawSync(Buffer.from(buffer.subarray(dataStart, dataEnd))); }
      catch { try { data = zlib.inflateSync(Buffer.from(buffer.subarray(dataStart, dataEnd))); } catch { } }
      if (data && data.length > 0 && !streams[name]) streams[name] = data;
    }
  }
  return streams;
}

function findDisplayLists(buffer) {
  const decompressed = decompressOpenSX(buffer);
  for (const [name, data] of Object.entries(decompressed)) {
    if (name.toLowerCase().includes('displaylist') && data.length > 100) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (buf.readUInt32LE(0) === 1 && buf.readUInt32LE(4) === 1) return data;
    }
  }
  return null;
}

const FACE_MARKER = Buffer.from([12, 0, 0, 0, 100, 0, 0, 0]);

function extractFaces(displayLists, vcLimit) {
  const faces = [];
  const matches = findAll(displayLists, FACE_MARKER);
  for (const mp of matches) {
    const faceStartOffset = mp - 4;
    if (faceStartOffset < 0) continue;
    const edgeCount = displayLists.readUInt32LE(faceStartOffset);
    if (edgeCount < 1 || edgeCount > 500) continue;
    if (displayLists.readUInt32LE(mp + 8) !== 2) continue;
    const vertexCount = displayLists.readUInt32LE(mp + 12);
    if (vertexCount < 3 || vertexCount > vcLimit) continue;
    const verticesStart = mp + 16;
    if (verticesStart + vertexCount * 12 > displayLists.length) continue;
    let ok = true;
    for (let i = 0; i < vertexCount; i++) {
      const x = displayLists.readFloatLE(verticesStart + i * 12);
      if (!isFinite(x) || Math.abs(x) > 1e5) { ok = false; break; }
    }
    if (!ok) continue;

    const verticesEnd = verticesStart + vertexCount * 12;
    const gapStart = verticesEnd;
    const normalsStart = gapStart + 16;
    const normalsEnd = normalsStart + vertexCount * 12;
    const block1Start = normalsEnd;
    if (block1Start + 16 > displayLists.length) continue;

    const gap = [
      displayLists.readUInt32LE(gapStart),
      displayLists.readUInt32LE(gapStart + 4),
      displayLists.readUInt32LE(gapStart + 8),
      displayLists.readUInt32LE(gapStart + 12),
    ];

    const b1h = [
      displayLists.readUInt32LE(block1Start),
      displayLists.readUInt32LE(block1Start + 4),
      displayLists.readUInt32LE(block1Start + 8),
      displayLists.readUInt32LE(block1Start + 12),
    ];
    const block1Length = b1h[3];
    if (block1Length < 1 || block1Length > 500000) continue;

    const block2Start = block1Start + (block1Length + 4) * 4;
    if (block2Start + 16 > displayLists.length) continue;
    const b2h = [
      displayLists.readUInt32LE(block2Start),
      displayLists.readUInt32LE(block2Start + 4),
      displayLists.readUInt32LE(block2Start + 8),
      displayLists.readUInt32LE(block2Start + 12),
    ];
    if (b2h[0] !== 4 || b2h[1] !== 8 || b2h[2] !== 2) continue;
    const block2Length = b2h[3];
    if (block2Length < 1 || block2Length > 100000) continue;

    const block2BodyStart = block2Start + 16;
    if (block2BodyStart + block2Length * 4 > displayLists.length) continue;
    const b2 = [];
    for (let i = 0; i < block2Length; i++) b2.push(displayLists.readUInt32LE(block2BodyStart + i * 4));

    const block1BodyStart = block1Start + 16;
    const block1 = [];
    for (let i = 0; i < block1Length; i++) block1.push(displayLists.readUInt32LE(block1BodyStart + i * 4));

    faces.push({
      markerOffset: mp,
      faceStartOffset,
      edgeCount,
      vertexCount,
      verticesStart,
      gap,
      block1Header: b1h,
      block1Length,
      block1Body: block1,
      block2Header: b2h,
      block2Length,
      block2Body: b2,
      block2Values: b2,
      isHighVc: vertexCount > 5000,
    });
  }
  return faces;
}

function runInvariantTests(face, fileCtx) {
  const results = {};

  // INV-002: Face block layout (gap + Block 1 header)
  const inv002Issues = [];
  if (face.gap[0] !== 12) inv002Issues.push('gap[0]=' + face.gap[0]);
  if (face.gap[1] !== 100) inv002Issues.push('gap[1]=' + face.gap[1]);
  if (face.gap[2] !== 2) inv002Issues.push('gap[2]=' + face.gap[2]);
  if (face.gap[3] !== face.vertexCount) inv002Issues.push('gap[3]=' + face.gap[3]);
  if (face.block1Header[0] !== 4) inv002Issues.push('b1h[0]=' + face.block1Header[0]);
  if (face.block1Header[1] !== 8) inv002Issues.push('b1h[1]=' + face.block1Header[1]);
  if (face.block1Header[2] !== 2) inv002Issues.push('b1h[2]=' + face.block1Header[2]);
  results['INV-002'] = { pass: inv002Issues.length === 0, issues: inv002Issues };

  // INV-003: gap == [12, 100, 2, vertexCount]
  const gapOk = face.gap[0] === 12 && face.gap[1] === 100 && face.gap[2] === 2 && face.gap[3] === face.vertexCount;
  results['INV-003'] = { pass: gapOk, value: face.gap, expected: [12, 100, 2, face.vertexCount] };

  // INV-004: block1Header[0..1] == [4, 8]
  results['INV-004'] = { pass: face.block1Header[0] === 4 && face.block1Header[1] === 8, value: [face.block1Header[0], face.block1Header[1]] };

  // INV-007: loopSize = (raw + 2) / 2 is integer
  const loopSizes = face.block2Body.map(v => (v + 2) / 2);
  const inv007Pass = loopSizes.every(v => Number.isInteger(v) && v >= 1);
  results['INV-007'] = { pass: inv007Pass, count: face.block2Body.length };

  // INV-008: block1Body starts with 1
  results['INV-008'] = { pass: face.block1Body[0] === 1, firstValue: face.block1Body[0] };

  // INV-009: ONE count == block2Length
  const oneCount = face.block1Body.filter(v => v === 1).length;
  results['INV-009'] = { pass: oneCount === face.block2Length, oneCount, block2Length: face.block2Length };

  // INV-010: no consecutive ONEs
  let noConsecutive = true;
  for (let i = 0; i < face.block1Body.length - 1; i++) {
    if (face.block1Body[i] === 1 && face.block1Body[i + 1] === 1) { noConsecutive = false; break; }
  }
  results['INV-010'] = { pass: noConsecutive };

  // INV-016: b1len == 2 * (vertexCount - sections)
  const sectionCount = oneCount;
  const i16 = face.block1Length === 2 * (face.vertexCount - sectionCount);
  results['INV-016'] = { pass: i16, b1len: face.block1Length, expected: 2 * (face.vertexCount - sectionCount) };

  // INV-017: sectionLen == b2[i] - 1
  const sections = [];
  let current = [];
  for (const t of face.block1Body) {
    if (t === 1) { if (current.length) sections.push(current); current = []; }
    else current.push(t);
  }
  if (current.length) sections.push(current);

  let i17 = true;
  if (sections.length !== face.block2Body.length) {
    i17 = false;
  } else {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].length !== face.block2Body[i] - 1) { i17 = false; break; }
    }
  }
  results['INV-017'] = { pass: i17, sectionCount: sections.length, b2Count: face.block2Body.length };

  // INV-018: sum(b2) == b1len
  const b2Sum = face.block2Body.reduce((a, b) => a + b, 0);
  results['INV-018'] = { pass: b2Sum === face.block1Length, sum: b2Sum, b1len: face.block1Length };

  return results;
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

const INVARIANT_IDS = ['INV-002', 'INV-003', 'INV-004', 'INV-007', 'INV-008', 'INV-009', 'INV-010', 'INV-016', 'INV-017', 'INV-018'];
const invStats = {};
for (const id of INVARIANT_IDS) invStats[id] = { pass: 0, fail: 0, exceptions: [] };

let totalFaces = 0;
let totalHighVc = 0;
const highVcFaces = [];
const allEdgeCounts = [];

console.log('='.repeat(70));
console.log('v0.4.2a EXPANDED CORPUS TEST (vc limit: 6000)');
console.log('='.repeat(70));

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED: not found'); continue; }

  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  // Extract with vc=6000
  const faces6k = extractFaces(dlBuf, 6000);
  // Extract with vc=5000 for comparison
  const faces5k = extractFaces(dlBuf, 5000);

  console.log('  Faces (vc<=6000): ' + faces6k.length);
  console.log('  Faces (vc<=5000): ' + faces5k.length);
  if (faces6k.length !== faces5k.length) {
    console.log('  EXTRA faces (vc 5001-6000): ' + (faces6k.length - faces5k.length));
  }
  totalFaces += faces6k.length;

  // Track edgeCount distribution
  for (const face of faces6k) allEdgeCounts.push(face.edgeCount);

  // Run invariants on all faces
  let filePass = 0, fileFail = 0;
  for (const face of faces6k) {
    const result = runInvariantTests(face, { shortName: file.shortName });
    for (const id of INVARIANT_IDS) {
      if (result[id].pass) {
        invStats[id].pass++;
        filePass++;
      } else {
        invStats[id].fail++;
        fileFail++;
        invStats[id].exceptions.push({
          file: file.shortName,
          marker: '0x' + face.markerOffset.toString(16),
          vc: face.vertexCount,
          result: result[id],
        });
      }
    }

    if (face.isHighVc) {
      totalHighVc++;
      highVcFaces.push({
        file: file.shortName,
        marker: '0x' + face.markerOffset.toString(16),
        vc: face.vertexCount,
        ec: face.edgeCount,
        b1len: face.block1Length,
        b2sum: face.block2Body.reduce((a, b) => a + b, 0),
        b2count: face.block2Body.length,
        b2range: Math.min(...face.block2Body) + '..' + Math.max(...face.block2Body),
        invResults: Object.entries(result).map(([k, v]) => k + ':' + (v.pass ? 'PASS' : 'FAIL')).join(' '),
      });
    }
  }

  console.log('  Invariant results: ' + filePass + ' pass, ' + fileFail + ' fail');
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('Total faces (vc<=6000): ' + totalFaces);
console.log('High-vc faces (vc>5000): ' + totalHighVc);
console.log('edgeCount range: ' + Math.min(...allEdgeCounts) + '..' + Math.max(...allEdgeCounts));
console.log('edgeCount unique values: ' + [...new Set(allEdgeCounts)].sort((a,b) => a-b).length);
console.log('edgeCount > 8: ' + allEdgeCounts.filter(e => e > 8).length + ' faces');
console.log('');
for (const id of INVARIANT_IDS) {
  const s = invStats[id];
  console.log(id + ': ' + s.pass + ' pass, ' + s.fail + ' fail');
  if (s.exceptions.length > 0) {
    for (const exc of s.exceptions) {
      console.log('  FAIL: ' + JSON.stringify(exc));
    }
  }
}

console.log('\n--- HIGH-VC FACES (vc > 5000) ---');
if (highVcFaces.length === 0) {
  console.log('None');
} else {
  for (const h of highVcFaces) {
    console.log('  ' + h.file + ' marker=' + h.marker + ' vc=' + h.vc + ' ec=' + h.ec +
      ' b1len=' + h.b1len + ' b2sum=' + h.b2sum + ' b2count=' + h.b2count + ' b2range=' + h.b2range);
    console.log('    ' + h.invResults);
  }
}

// Write JSON results
const output = {
  meta: {
    version: 'v0.4.2a',
    vcLimit: 6000,
    date: new Date().toISOString(),
    corpusSize: CORPUS.length,
    totalFaces,
    totalHighVc,
  },
  invariantStats: invStats,
  highVcFaces,
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.2a', 'EXPANDED_TEST_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.2a/EXPANDED_TEST_RESULTS.json');
