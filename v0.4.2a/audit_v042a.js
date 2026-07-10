#!/usr/bin/env node
/**
 * audit_v042a.js — v0.4.2a Reviewer Criticism Audit
 *
 * Audit 1: Parser filtering circularity — log every rejected candidate
 * Audit 2: Two DEKOR faces — byte-level trace of failures
 * Audit 3: Mathematical independence of INV-018
 * Audit 4: INV-012 vs INV-017 root cause analysis
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ============================================================
// UTILITIES
// ============================================================

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
  for (const matchPos of findAll(buffer, magic)) {
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
// AUDIT 1: EXHAUSTIVE FACE CANDIDATE EXTRACTION
// ============================================================

const FACE_MARKER = Buffer.from([12, 0, 0, 0, 100, 0, 0, 0]);

/**
 * Extract ALL face candidates, accepting and rejecting each one.
 * Returns { accepted: [...], rejected: [...], reasons: {...} }
 *
 * Every filtering decision is logged with a reason code.
 */
function extractAllCandidates(displayLists) {
  const matches = findAll(displayLists, FACE_MARKER);
  const accepted = [];
  const rejected = [];
  const reasonCounts = {};

  for (const mp of matches) {
    const faceStartOffset = mp - 4;
    const candidate = {
      markerOffset: mp,
      faceStartOffset,
      byteRange: `0x${faceStartOffset.toString(16)}..0x${(faceStartOffset + 20).toString(16)}`,
    };

    // Filter 1: bounds check
    if (faceStartOffset < 0) {
      rejected.push({ ...candidate, reason: 'F1_BOUNDS_NEG', detail: 'faceStartOffset < 0' });
      reasonCounts['F1_BOUNDS_NEG'] = (reasonCounts['F1_BOUNDS_NEG'] || 0) + 1;
      continue;
    }

    // Filter 2: edgeCount range
    const edgeCount = displayLists.readUInt32LE(faceStartOffset);
    if (edgeCount < 1 || edgeCount > 500) {
      rejected.push({ ...candidate, reason: 'F2_EDGECOUNT_RANGE', detail: `edgeCount=${edgeCount}`, edgeCount });
      reasonCounts['F2_EDGECOUNT_RANGE'] = (reasonCounts['F2_EDGECOUNT_RANGE'] || 0) + 1;
      continue;
    }

    // Filter 3: byte at mp+8 must equal 2
    const fieldAtMp8 = displayLists.readUInt32LE(mp + 8);
    if (fieldAtMp8 !== 2) {
      rejected.push({ ...candidate, reason: 'F3_FIELD_AT_MP8', detail: `mp+8=${fieldAtMp8}, expected 2`, edgeCount, fieldAtMp8 });
      reasonCounts['F3_FIELD_AT_MP8'] = (reasonCounts['F3_FIELD_AT_MP8'] || 0) + 1;
      continue;
    }

    // Filter 4: vertexCount range
    const vertexCount = displayLists.readUInt32LE(mp + 12);
    if (vertexCount < 3 || vertexCount > 5000) {
      rejected.push({ ...candidate, reason: 'F4_VERTEXCOUNT_RANGE', detail: `vertexCount=${vertexCount}`, edgeCount, vertexCount });
      reasonCounts['F4_VERTEXCOUNT_RANGE'] = (reasonCounts['F4_VERTEXCOUNT_RANGE'] || 0) + 1;
      continue;
    }

    // Filter 5: position array bounds
    const verticesStart = mp + 16;
    if (verticesStart + vertexCount * 12 > displayLists.length) {
      rejected.push({ ...candidate, reason: 'F5_POS_BOUNDS', detail: `verticesEnd=${verticesStart + vertexCount * 12} > dlLen=${displayLists.length}`, edgeCount, vertexCount });
      reasonCounts['F5_POS_BOUNDS'] = (reasonCounts['F5_POS_BOUNDS'] || 0) + 1;
      continue;
    }

    // Filter 6: position float validity
    let floatInvalid = false;
    for (let i = 0; i < vertexCount; i++) {
      const x = displayLists.readFloatLE(verticesStart + i * 12);
      if (!isFinite(x) || Math.abs(x) > 1e5) { floatInvalid = true; break; }
    }
    if (floatInvalid) {
      rejected.push({ ...candidate, reason: 'F6_FLOAT_INVALID', detail: 'position float not finite or > 1e5', edgeCount, vertexCount });
      reasonCounts['F6_FLOAT_INVALID'] = (reasonCounts['F6_FLOAT_INVALID'] || 0) + 1;
      continue;
    }

    // Filter 7: Block 1 header bounds
    const verticesEnd = verticesStart + vertexCount * 12;
    const gapStart = verticesEnd;
    const gapEnd = gapStart + 16;
    const normalsStart = gapEnd;
    const normalsEnd = normalsStart + vertexCount * 12;
    const block1Start = normalsEnd;

    if (block1Start + 16 > displayLists.length) {
      rejected.push({ ...candidate, reason: 'F7_B1_BOUNDS', detail: `block1Start+16=${block1Start + 16} > dlLen=${displayLists.length}`, edgeCount, vertexCount });
      reasonCounts['F7_B1_BOUNDS'] = (reasonCounts['F7_B1_BOUNDS'] || 0) + 1;
      continue;
    }

    // Filter 8: Block 1 header magic [4, 8, 2, N] -- CIRCULAR VALIDATION CHECK
    const b1h0 = displayLists.readUInt32LE(block1Start);
    const b1h1 = displayLists.readUInt32LE(block1Start + 4);
    const b1h2 = displayLists.readUInt32LE(block1Start + 8);
    if (b1h0 !== 4 || b1h1 !== 8 || b1h2 !== 2) {
      rejected.push({
        ...candidate,
        reason: 'F8_B1_HEADER_MAGIC',
        detail: `Block 1 header [${b1h0}, ${b1h1}, ${b1h2}, ?] != [4, 8, 2, ?]`,
        edgeCount, vertexCount,
        b1HeaderObserved: [b1h0, b1h1, b1h2],
      });
      reasonCounts['F8_B1_HEADER_MAGIC'] = (reasonCounts['F8_B1_HEADER_MAGIC'] || 0) + 1;
      continue;
    }

    // Filter 9: Block 1 length range
    const block1Length = displayLists.readUInt32LE(block1Start + 12);
    if (block1Length > 100000) {
      rejected.push({ ...candidate, reason: 'F9_B1_LENGTH_RANGE', detail: `block1Length=${block1Length}`, edgeCount, vertexCount, block1Length });
      reasonCounts['F9_B1_LENGTH_RANGE'] = (reasonCounts['F9_B1_LENGTH_RANGE'] || 0) + 1;
      continue;
    }

    // Filter 10: Block 1 data bounds
    if (block1Start + 16 + block1Length * 4 > displayLists.length) {
      rejected.push({ ...candidate, reason: 'F10_B1_DATA_BOUNDS', detail: `b1End=${block1Start + 16 + block1Length * 4} > dlLen=${displayLists.length}`, edgeCount, vertexCount, block1Length });
      reasonCounts['F10_B1_DATA_BOUNDS'] = (reasonCounts['F10_B1_DATA_BOUNDS'] || 0) + 1;
      continue;
    }

    // Read Block 1
    const block1 = [];
    for (let i = 0; i < block1Length; i++) block1.push(displayLists.readUInt32LE(block1Start + 16 + i * 4));

    // Filter 11: Block 2 header magic (if present) -- CIRCULAR VALIDATION CHECK
    const b2Start = block1Start + (block1Length + 4) * 4;
    let hasBlock2 = false;
    let b2Header = null;
    if (b2Start + 16 <= displayLists.length) {
      const b2h0 = displayLists.readUInt32LE(b2Start);
      const b2h1 = displayLists.readUInt32LE(b2Start + 4);
      const b2h2 = displayLists.readUInt32LE(b2Start + 8);
      b2Header = [b2h0, b2h1, b2h2, displayLists.readUInt32LE(b2Start + 12)];
      if (b2h0 === 4 && b2h1 === 8 && b2h2 === 2) {
        hasBlock2 = true;
      }
    }

    // Read gap marker
    const gap = [
      displayLists.readUInt32LE(gapStart),
      displayLists.readUInt32LE(gapStart + 4),
      displayLists.readUInt32LE(gapStart + 8),
      displayLists.readUInt32LE(gapStart + 12),
    ];

    // Read Block 2
    let block2 = [];
    if (hasBlock2) {
      const b2Len = b2Header[3];
      if (b2Len <= 10000 && b2Start + 16 + b2Len * 4 <= displayLists.length) {
        for (let i = 0; i < b2Len; i++) block2.push(displayLists.readUInt32LE(b2Start + 16 + i * 4));
      }
    }

    // ACCEPTED
    accepted.push({
      markerOffset: mp,
      faceStartOffset,
      edgeCount,
      vertexCount,
      block1Length,
      block1,
      block2,
      hasBlock2,
      gap,
      b2Header,
      bytesAtBlock1Start: Array.from(displayLists.subarray(block1Start, block1Start + 16)),
      bytesAtGap: Array.from(displayLists.subarray(gapStart, gapEnd)),
    });
  }

  return { accepted, rejected, reasonCounts, totalMarkers: matches.length };
}

// ============================================================
// AUDIT 2: DEKOR FACE TRACE
// ============================================================

/**
 * Find faces that fail INV-016, INV-017, or INV-018.
 * Produce byte-level trace for each failure.
 */
function traceFaces(displayLists, faces) {
  const failures = [];
  for (let fi = 0; fi < faces.length; fi++) {
    const f = faces[fi];
    if (f.block1.length === 0) continue;

    // Split into sections
    const sections = [];
    let current = [];
    for (const token of f.block1) {
      if (token === 1) {
        if (current.length > 0) sections.push(current);
        current = [];
      } else {
        current.push(token);
      }
    }
    if (current.length > 0) sections.push(current);

    const sectionCount = sections.length;

    // INV-016: b1len == 2 * (vc - secs)
    const i16_expected = 2 * (f.vertexCount - sectionCount);
    const i16_pass = f.block1.length === i16_expected;

    // INV-017: each section len == block2[i] - 1
    const i17_issues = [];
    if (f.hasBlock2 && f.block2.length > 0) {
      const minLen = Math.min(sections.length, f.block2.length);
      for (let si = 0; si < minLen; si++) {
        const expected = f.block2[si] - 1;
        if (sections[si].length !== expected) {
          i17_issues.push({
            sectionIndex: si,
            sectionLen: sections[si].length,
            block2Raw: f.block2[si],
            expected,
            diff: sections[si].length - expected,
          });
        }
      }
      if (sections.length !== f.block2.length) {
        i17_issues.push({
          sectionIndex: -1,
          issue: 'sectionCountMismatch',
          sectionCount: sections.length,
          block2Count: f.block2.length,
        });
      }
    }

    // INV-018: sum(block2) == b1len
    const b2Sum = f.block2.reduce((a, b) => a + b, 0);
    const i18_pass = b2Sum === f.block1.length;

    if (!i16_pass || i17_issues.length > 0 || !i18_pass) {
      // Byte-level trace
      const b1Start = f.normalsEnd;
      const b1Bytes = displayLists.subarray(b1Start, b1Start + Math.min(64, f.block1Length * 4 + 16));

      failures.push({
        faceIndex: fi,
        edgeCount: f.edgeCount,
        vertexCount: f.vertexCount,
        block1Length: f.block1.length,
        sectionCount,
        block2: f.block2,
        b2Sum,
        i16: { pass: i16_pass, expected: i16_expected, actual: f.block1.length },
        i17: { pass: i17_issues.length === 0, issues: i17_issues },
        i18: { pass: i18_pass, expected: f.block1.length, actual: b2Sum },
        block1First20: f.block1.slice(0, 20),
        block1Last10: f.block1.slice(-10),
        byteTrace: Array.from(b1Bytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
      });
    }
  }
  return failures;
}

// ============================================================
// MAIN
// ============================================================

const RESEARCH_DIR = path.resolve(__dirname, '..');
const FILES = [
  { shortName: 'BOTTOM', path: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case BOTTOM.SLDPRT') },
  { shortName: 'TOP', path: path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case TOP.SLDPRT') },
  { shortName: 'GEAR', path: path.join(RESEARCH_DIR, 'test files original', 'Helical Bevel Gear.SLDPRT') },
  { shortName: 'DEKOR', path: path.join(RESEARCH_DIR, 'test files original', 'Dekor.SLDPRT') },
  { shortName: 'HEADPHONE', path: path.join(RESEARCH_DIR, 'untouched', 'Headphone Stand.SLDPRT') },
  { shortName: 'DISTRIBUTOR', path: path.join(RESEARCH_DIR, 'untouched', 'distributor main boss rev a.SLDPRT') },
  { shortName: 'POCKET', path: path.join(RESEARCH_DIR, 'untouched', 'Pocket Wheel.SLDPRT') },
  { shortName: 'PTC', path: path.join(RESEARCH_DIR, 'untouched', 'PTC GE8080-8.SLDPRT') },
];

const audit1Results = {};
const audit2Results = {};
let totalAccepted = 0;
let totalRejected = 0;
let totalMarkers = 0;

console.log('='.repeat(70));
console.log('v0.4.2a AUDIT');
console.log('='.repeat(70));

for (const file of FILES) {
  console.log(`\n--- ${file.shortName} ---`);

  if (!fs.existsSync(file.path)) {
    console.log('  File not found');
    continue;
  }

  const raw = fs.readFileSync(file.path);
  const dl = findDisplayLists(raw);
  if (!dl) {
    console.log('  No DisplayLists found');
    continue;
  }

  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  // ============================================================
  // AUDIT 1: Exhaustive candidate extraction
  // ============================================================
  const result = extractAllCandidates(dlBuf);
  audit1Results[file.shortName] = result;
  totalAccepted += result.accepted.length;
  totalRejected += result.rejected.length;
  totalMarkers += result.totalMarkers;

  console.log(`  Markers found: ${result.totalMarkers}`);
  console.log(`  Accepted: ${result.accepted.length}`);
  console.log(`  Rejected: ${result.rejected.length}`);
  if (Object.keys(result.reasonCounts).length > 0) {
    console.log(`  Rejection reasons:`);
    for (const [reason, count] of Object.entries(result.reasonCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${reason}: ${count}`);
    }
  }

  // Show first few rejections as examples
  if (result.rejected.length > 0) {
    console.log(`  Sample rejections (first 3):`);
    for (const r of result.rejected.slice(0, 3)) {
      console.log(`    marker@0x${r.markerOffset.toString(16)}: ${r.reason} — ${r.detail}`);
    }
  }

  // ============================================================
  // AUDIT 2: Trace faces for INV-016/017/018 failures
  // ============================================================
  const traces = traceFaces(dlBuf, result.accepted);
  if (traces.length > 0) {
    audit2Results[file.shortName] = traces;
    console.log(`  INV failures: ${traces.length}`);
    for (const t of traces) {
      console.log(`    Face ${t.faceIndex}: vc=${t.vertexCount} b1len=${t.block1Length} secs=${t.sectionCount} b2=${JSON.stringify(t.block2)}`);
      if (!t.i16.pass) console.log(`      INV-016 FAIL: actual=${t.i16.actual} expected=${t.i16.expected}`);
      if (!t.i17.pass) console.log(`      INV-017 FAIL: ${JSON.stringify(t.i17.issues)}`);
      if (!t.i18.pass) console.log(`      INV-018 FAIL: sum(b2)=${t.i18.actual} != b1len=${t.i18.expected}`);
      console.log(`      block1[0..19]: [${t.block1First20.join(', ')}]`);
      console.log(`      block1[-10..]: [${t.block1Last10.join(', ')}]`);
      console.log(`      bytes@b1start: ${t.byteTrace}`);
    }
  }
}

// ============================================================
// AUDIT 3: INV-018 MATHEMATICAL INDEPENDENCE
// ============================================================

console.log('\n' + '='.repeat(70));
console.log('AUDIT 3: INV-018 MATHEMATICAL INDEPENDENCE');
console.log('='.repeat(70));

// INV-016: b1len = 2 * (vc - secs)
// INV-017: sum(sectionLen[i]) = sum(b2[i] - 1)
//           equivalently: sectionLen[i] = b2[i] - 1
//           equivalently: b2[i] = sectionLen[i] + 1
//           equivalently: sum(b2) = sum(sectionLen) + secs
//
// INV-018: sum(b2) = b1len
//
// From INV-016: b1len = 2*vc - 2*secs
// From INV-017: sum(b2) = sum(sectionLen) + secs
// From section splitting: sum(sectionLen) = b1len (by construction, since sections split b1 body)
// Therefore: sum(b2) = b1len + secs ???
//
// Wait, let me re-derive:
// b1 body = [ONE, sec0, ONE, sec1, ..., ONE, secN-1] (but first ONE is at position 0)
// Actually: b1 = [1, sec0_tokens..., 1, sec1_tokens..., ..., 1, secN-1_tokens...]
// The sections are the non-ONE tokens between ONEs.
// sum(sectionLen) = b1len - secs (because there are secs ONEs removed)
//
// INV-017 says: sectionLen[i] = b2[i] - 1
// Therefore: sum(b2[i] - 1) = sum(sectionLen) = b1len - secs
// Therefore: sum(b2) - secs = b1len - secs
// Therefore: sum(b2) = b1len
//
// This IS INV-018. So INV-018 FOLLOWS FROM INV-017 + section splitting definition.

console.log('Derivation:');
console.log('  From section splitting: sum(sectionLen) = b1len - secs');
console.log('  From INV-017: sectionLen[i] = b2[i] - 1');
console.log('  Therefore: sum(b2[i] - 1) = b1len - secs');
console.log('  Therefore: sum(b2) - secs = b1len - secs');
console.log('  Therefore: sum(b2) = b1len  [this is INV-018]');
console.log('');
console.log('CONCLUSION: INV-018 is NOT mathematically independent.');
console.log('It follows from INV-017 plus the definition of section splitting.');
console.log('');
console.log('Verification: does every face where INV-017 passes also have INV-018 pass?');

let inv017Pass = 0, inv018AlsoPass = 0, inv018Fails = 0;
for (const file of FILES) {
  if (!fs.existsSync(file.path)) continue;
  const raw = fs.readFileSync(file.path);
  const dl = findDisplayLists(raw);
  if (!dl) continue;
  const result = extractAllCandidates(Buffer.isBuffer(dl) ? dl : Buffer.from(dl));
  for (const f of result.accepted) {
    if (f.block1.length === 0 || !f.hasBlock2 || f.block2.length === 0) continue;
    // Split sections
    const sections = [];
    let current = [];
    for (const token of f.block1) {
      if (token === 1) { if (current.length) sections.push(current); current = []; }
      else current.push(token);
    }
    if (current.length) sections.push(current);

    // Check INV-017
    let i17 = true;
    if (sections.length !== f.block2.length) i17 = false;
    else {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].length !== f.block2[i] - 1) { i17 = false; break; }
      }
    }

    if (i17) {
      inv017Pass++;
      const b2Sum = f.block2.reduce((a, b) => a + b, 0);
      if (b2Sum === f.block1.length) inv018AlsoPass++;
      else { inv018Fails++; console.log(`  INV-017 passes but INV-018 fails: ${file.shortName} face b1len=${f.block1.length} b2sum=${b2Sum}`); }
    }
  }
}

console.log(`  INV-017 passes: ${inv017Pass}`);
console.log(`  INV-018 also passes: ${inv018AlsoPass}`);
console.log(`  INV-018 fails when INV-017 passes: ${inv018Fails}`);
if (inv018Fails === 0) {
  console.log('  VERDICT: INV-018 is a mathematical consequence of INV-017 + section splitting.');
} else {
  console.log('  VERDICT: INV-018 has cases where it fails independently of INV-017.');
}

// ============================================================
// AUDIT 4: INV-012 vs INV-017 ROOT CAUSE
// ============================================================

console.log('\n' + '='.repeat(70));
console.log('AUDIT 4: INV-012 vs INV-017 ROOT CAUSE');
console.log('='.repeat(70));

console.log('');
console.log('INV-012 documents:');
console.log('  len = 2 * loopSize - 2');
console.log('  where loopSize = (raw + 2) / 2');
console.log('  substitution: len = 2*((raw+2)/2) - 2 = raw + 2 - 2 = raw');
console.log('  So INV-012 predicts: sectionLen = raw (Block 2 value)');
console.log('');
console.log('INV-017 documents:');
console.log('  sectionBodyTokenCount = Block2[i] - 1');
console.log('  So INV-017 predicts: sectionLen = raw - 1');
console.log('');
console.log('These differ by exactly 1. Testing on corpus:');

let matchRaw = 0, matchRawMinus1 = 0, matchNeither = 0, totalSections = 0;
let matchRawEx = [], matchNeitherEx = [];

for (const file of FILES) {
  if (!fs.existsSync(file.path)) continue;
  const raw = fs.readFileSync(file.path);
  const dl = findDisplayLists(raw);
  if (!dl) continue;
  const result = extractAllCandidates(Buffer.isBuffer(dl) ? dl : Buffer.from(dl));
  for (const f of result.accepted) {
    if (f.block1.length === 0 || !f.hasBlock2 || f.block2.length === 0) continue;
    const sections = [];
    let current = [];
    for (const token of f.block1) {
      if (token === 1) { if (current.length) sections.push(current); current = []; }
      else current.push(token);
    }
    if (current.length) sections.push(current);

    const minLen = Math.min(sections.length, f.block2.length);
    for (let i = 0; i < minLen; i++) {
      totalSections++;
      const rawVal = f.block2[i];
      const len = sections[i].length;
      if (len === rawVal) {
        matchRaw++;
        if (matchRawEx.length < 5) matchRawEx.push({ file: file.shortName, raw: rawVal, len, section: sections[i].slice(0, 5) });
      }
      else if (len === rawVal - 1) matchRawMinus1++;
      else {
        matchNeither++;
        if (matchNeitherEx.length < 5) matchNeitherEx.push({ file: file.shortName, raw: rawVal, len, diff: len - rawVal });
      }
    }
  }
}

console.log(`  Total sections: ${totalSections}`);
console.log(`  Matches len = raw (INV-012): ${matchRaw} (${(100*matchRaw/totalSections).toFixed(1)}%)`);
console.log(`  Matches len = raw - 1 (INV-017): ${matchRawMinus1} (${(100*matchRawMinus1/totalSections).toFixed(1)}%)`);
console.log(`  Matches neither: ${matchNeither}`);

if (matchRawEx.length > 0) {
  console.log('\n  Examples matching raw (INV-012):');
  for (const ex of matchRawEx) {
    console.log(`    ${ex.file}: raw=${ex.raw} len=${ex.len} firstTokens=[${ex.section}]`);
  }
}

if (matchNeitherEx.length > 0) {
  console.log('\n  Examples matching neither:');
  for (const ex of matchNeitherEx) {
    console.log(`    ${ex.file}: raw=${ex.raw} len=${ex.len} diff=${ex.diff}`);
  }
}

console.log('');
console.log('ROOT CAUSE ANALYSIS:');
if (matchRaw === 0 && matchRawMinus1 === totalSections) {
  console.log('  INV-012 is a documentation mistake. The formula reduces to len = raw,');
  console.log('  but every section has len = raw - 1. The documented formula is off by +1.');
  console.log('  The correct formula would be: len = 2 * loopSize - 3');
  console.log('  Or equivalently: len = raw - 1 (which is INV-017).');
} else if (matchRaw > 0 && matchRawMinus1 > 0) {
  console.log('  Both formulas appear in the corpus. This may indicate multiple format variants.');
} else if (matchRaw > 0) {
  console.log('  INV-012 (len = raw) is correct. INV-017 may be wrong.');
} else {
  console.log('  INV-017 (len = raw - 1) is correct. INV-012 formula is wrong.');
}

// ============================================================
// WRITE RESULTS
// ============================================================

const output = {
  meta: {
    version: 'v0.4.2a',
    date: new Date().toISOString(),
    filesAudited: Object.keys(audit1Results).length,
    totalMarkers,
    totalAccepted,
    totalRejected,
  },
  audit1_circularity: {
    summary: Object.fromEntries(Object.entries(audit1Results).map(([k, v]) => [k, {
      markers: v.totalMarkers,
      accepted: v.accepted.length,
      rejected: v.rejected.length,
      reasons: v.reasonCounts,
    }])),
    circularFilters: [
      'F8_B1_HEADER_MAGIC: Filters on Block 1 header [4,8,2,N] — this IS INV-005',
      'F11_B2_HEADER_MAGIC: Filters on Block 2 header [4,8,2,M] — this IS INV-006',
    ],
    note: 'Every face accepted by the pipeline already satisfies INV-002, INV-004, INV-005, INV-006 by construction.',
  },
  audit2_dekor_faces: {
    note: 'Faces that fail INV-016/017/018 after passing extraction filters.',
    results: audit2Results,
  },
  audit3_inv018_independence: {
    conclusion: inv018Fails === 0 ? 'INV-018 is a mathematical consequence of INV-017 + section splitting.' : 'INV-018 has independent failures.',
    inv017PassCount: inv017Pass,
    inv018AlsoPassCount: inv018AlsoPass,
    inv018FailCount: inv018Fails,
  },
  audit4_inv012_rootCause: {
    matchRaw,
    matchRawMinus1,
    matchNeither,
    totalSections,
    conclusion: matchRaw === 0 ? 'Documentation mistake: formula reduces to len=raw, but actual data is len=raw-1.' : 'Both formulas found in corpus.',
  },
};

const outPath = path.join(__dirname, 'AUDIT_RESULTS.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nAudit results written to: ${outPath}`);
