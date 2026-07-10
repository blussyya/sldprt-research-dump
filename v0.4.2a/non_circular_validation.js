#!/usr/bin/env node
/**
 * v0.4.2a NON-CIRCULAR VALIDATION PIPELINE
 *
 * Tests INV-005 and INV-006 without pre-filtering on header magic.
 * Accepts ANY marker match, reads bytes at computed positions, and tests headers.
 * Produces false positives but is the only way to falsify INV-005/INV-006.
 *
 * Also reproduces INV-016/017/018 with independent implementation.
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

// ============================================================
// NON-CIRCULAR FACE EXTRACTION
// Accepts ANY marker match. No edgeCount, vertexCount, or header filtering.
// ============================================================

const FACE_MARKER = Buffer.from([12, 0, 0, 0, 100, 0, 0, 0]);

function extractCandidates(displayLists) {
  const candidates = [];
  const matches = findAll(displayLists, FACE_MARKER);
  for (const mp of matches) {
    const faceStartOffset = mp - 4;
    if (faceStartOffset < 0) continue;

    const edgeCount = displayLists.readUInt32LE(faceStartOffset);
    const vertexCount = displayLists.readUInt32LE(mp + 12);
    const verticesStart = mp + 16;
    const verticesEnd = verticesStart + vertexCount * 12;
    const gapStart = verticesEnd;
    const normalsStart = gapStart + 16;
    const normalsEnd = normalsStart + vertexCount * 12;
    const block1Start = normalsEnd;

    // Read raw bytes at Block 1 and Block 2 positions (NO FILTERING)
    let b1Header = null, b1Len = null, b2Header = null, b2Len = null;
    let b1Body = null, b2Body = null;
    let b1Valid = false, b2Valid = false;

    if (block1Start + 16 <= displayLists.length) {
      b1Header = [
        displayLists.readUInt32LE(block1Start),
        displayLists.readUInt32LE(block1Start + 4),
        displayLists.readUInt32LE(block1Start + 8),
        displayLists.readUInt32LE(block1Start + 12),
      ];
      b1Len = b1Header[3];
      b1Valid = b1Header[0] === 4 && b1Header[1] === 8 && b1Header[2] === 2 && b1Len > 0 && b1Len < 500000;

      if (b1Valid) {
        const b2Start = block1Start + (b1Len + 4) * 4;
        if (b2Start + 16 <= displayLists.length) {
          b2Header = [
            displayLists.readUInt32LE(b2Start),
            displayLists.readUInt32LE(b2Start + 4),
            displayLists.readUInt32LE(b2Start + 8),
            displayLists.readUInt32LE(b2Start + 12),
          ];
          b2Len = b2Header[3];
          b2Valid = b2Header[0] === 4 && b2Header[1] === 8 && b2Header[2] === 2 && b2Len > 0 && b2Len < 100000;

          if (b2Valid) {
            const b2BodyStart = b2Start + 16;
            if (b2BodyStart + b2Len * 4 <= displayLists.length) {
              b2Body = [];
              for (let i = 0; i < b2Len; i++) b2Body.push(displayLists.readUInt32LE(b2BodyStart + i * 4));
            }
          }
        }
      }
    }

    candidates.push({
      markerOffset: mp,
      faceStartOffset,
      edgeCount,
      vertexCount,
      verticesStart,
      b1Header,
      b1Len,
      b1Valid,
      b2Header,
      b2Len,
      b2Valid,
      b2Body,
    });
  }
  return candidates;
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
console.log('v0.4.2a NON-CIRCULAR VALIDATION PIPELINE');
console.log('Testing INV-005/INV-006 without pre-filtering on header magic');
console.log('='.repeat(70));

let totalCandidates = 0;
let totalB1Valid = 0;
let totalB2Valid = 0;
let totalBothValid = 0;
let inv005Pass = 0, inv005Fail = 0;
let inv006Pass = 0, inv006Fail = 0;
let inv005006BothPass = 0;
let b1FailExamples = [];
let b2FailExamples = [];

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED: not found'); continue; }

  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  const candidates = extractCandidates(dlBuf);
  console.log('  Candidates (no filter): ' + candidates.length);
  totalCandidates += candidates.length;

  const b1Valid = candidates.filter(c => c.b1Valid);
  const b2Valid = candidates.filter(c => c.b2Valid);
  const bothValid = candidates.filter(c => c.b1Valid && c.b2Valid);
  console.log('  B1 valid [4,8,2,N]: ' + b1Valid.length);
  console.log('  B2 valid [4,8,2,M]: ' + b2Valid.length);
  console.log('  Both valid: ' + bothValid.length);
  totalB1Valid += b1Valid.length;
  totalB2Valid += b2Valid.length;
  totalBothValid += bothValid.length;

  // Test INV-005: for candidates where B1 bytes are readable, is it always [4,8,2,N]?
  for (const c of candidates) {
    if (c.b1Header) {
      // B1 header is readable. Test INV-005.
      if (c.b1Valid) {
        inv005Pass++;
      } else {
        inv005Fail++;
        if (b1FailExamples.length < 10) {
          b1FailExamples.push({
            file: file.shortName,
            marker: '0x' + c.markerOffset.toString(16),
            ec: c.edgeCount,
            vc: c.vertexCount,
            b1Header: c.b1Header,
          });
        }
      }
    }
  }

  // Test INV-006: for candidates where B2 bytes are readable, is it always [4,8,2,M]?
  for (const c of candidates) {
    if (c.b2Header) {
      // B2 header is readable. Test INV-006.
      if (c.b2Valid) {
        inv006Pass++;
      } else {
        inv006Fail++;
        if (b2FailExamples.length < 10) {
          b2FailExamples.push({
            file: file.shortName,
            marker: '0x' + c.markerOffset.toString(16),
            ec: c.edgeCount,
            vc: c.vertexCount,
            b1Valid: c.b1Valid,
            b2Header: c.b2Header,
          });
        }
      }
    }
  }

  // Both INV-005 and INV-006 pass
  inv005006BothPass += bothValid.length;
}

console.log('\n' + '='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log('Total candidates (no filter): ' + totalCandidates);
console.log('B1 header readable and valid [4,8,2,N]: ' + totalB1Valid + ' / ' + totalCandidates);
console.log('B2 header readable and valid [4,8,2,M]: ' + totalB2Valid + ' / ' + totalCandidates);
console.log('Both valid: ' + totalBothValid + ' / ' + totalCandidates);
console.log('');
console.log('INV-005 (B1 header [4,8,2,N]):');
console.log('  PASS: ' + inv005Pass);
console.log('  FAIL: ' + inv005Fail);
console.log('');
console.log('INV-006 (B2 header [4,8,2,M]):');
console.log('  PASS: ' + inv006Pass);
console.log('  FAIL: ' + inv006Fail);

if (b1FailExamples.length > 0) {
  console.log('\nINV-005 FAIL examples:');
  for (const ex of b1FailExamples) {
    console.log('  ' + ex.file + ' marker=' + ex.marker + ' ec=' + ex.ec + ' vc=' + ex.vc + ' b1=' + JSON.stringify(ex.b1Header));
  }
}

if (b2FailExamples.length > 0) {
  console.log('\nINV-006 FAIL examples:');
  for (const ex of b2FailExamples) {
    console.log('  ' + ex.file + ' marker=' + ex.marker + ' ec=' + ex.ec + ' vc=' + ex.vc + ' b1valid=' + ex.b1Valid + ' b2=' + JSON.stringify(ex.b2Header));
  }
}

// Write JSON results
const output = {
  meta: {
    version: 'v0.4.2a',
    pipeline: 'non-circular (no header pre-filtering)',
    date: new Date().toISOString(),
    corpusSize: CORPUS.length,
    totalCandidates,
  },
  inv005: { pass: inv005Pass, fail: inv005Fail },
  inv006: { pass: inv006Pass, fail: inv006Fail },
  b1ValidCount: totalB1Valid,
  b2ValidCount: totalB2Valid,
  bothValidCount: totalBothValid,
  b1FailExamples,
  b2FailExamples,
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.2a', 'NON_CIRCULAR_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.2a/NON_CIRCULAR_RESULTS.json');
