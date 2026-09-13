#!/usr/bin/env node
/**
 * EXP-024-CORRECTED: Rejected Candidate Audit (Block2 offset fix)
 *
 * Corrects the same Block1->Block2 offset bug identified by the v0.4.4
 * falsification review (v0.4.4/FALSIFICATION_REVIEW.md) in the original
 * v0.4.4/exp024_rejected_candidate_audit.js.
 *
 * ROOT CAUSE: identical to EXP-023 (see
 * v0.4.5/exp023_alternative_header_characterization_corrected.js header
 * comment for the full derivation). In short: the original script read
 * block1Start+0 (always the constant header tag `4`) and used it as N,
 * so `block1Start + b1Word0 * 4` always evaluated to `block1Start + 16`
 * -- the start of Block1's own body, not Block2. This caused every
 * candidate to fail B2 validation, so INV-016/017/018 never executed.
 *
 * CORRECTION: read the true 4-word Block1 header [4,8,2,N] (N at
 * block1Start+12, per INV-005), then compute
 *   block2Start = block1Start + (N + 4) * 4
 * per the established header-inclusive formula, and validate the real
 * Block2 header [4,8,2,M] there (per INV-006) before running INV-016,
 * INV-017 and INV-018 against the real Block1/Block2 body data.
 *
 * All pipeline stages prior to Block1-header validation (EC, gap word2,
 * VC, vertex overflow/validity, gap overflow/exactness) are unchanged
 * from v0.4.4/exp024_rejected_candidate_audit.js. Category names for the
 * B1/B2/INV stages are renamed to reflect what is actually being
 * checked now that the header is read correctly; this is a direct
 * consequence of the single root-cause fix, not a new hypothesis.
 *
 * This is a NEW file. The original v0.4.4 script and its results are
 * NOT modified.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESEARCH_DIR = path.resolve(__dirname, '..'); // portability fix: repo root, not hardcoded Windows path
const TEST_DIR = path.join(RESEARCH_DIR, 'test files original');

const FILES = [
  'usb hub case (ultimate test)/USB hub case BOTTOM.SLDPRT',
  'usb hub case (ultimate test)/USB hub case TOP.SLDPRT',
  'Helical Bevel Gear.SLDPRT',
  'Dekor.SLDPRT',
  'SW2000-s01.SLDPRT',
  'distributor main boss rev a.SLDPRT',
  'Pocket Wheel.SLDPRT',
  'PTC GE8080-8.SLDPRT',
];

const FACE_MARKER = Buffer.from([12, 0, 0, 0, 100, 0, 0, 0]);

// Decompression utilities (unchanged from v0.4.4)
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
      for (let i = 0; i < nameSize; i++) {
        name += String.fromCharCode(rolByte(buffer[nameStart + i], key));
      }

      if (!name) continue;

      let data;
      try {
        data = zlib.inflateRawSync(Buffer.from(buffer.subarray(dataStart, dataEnd)));
      } catch (e) {
        try {
          data = zlib.inflateSync(Buffer.from(buffer.subarray(dataStart, dataEnd)));
        } catch (e2) { }
      }

      if (data && data.length > 0 && !streams[name]) {
        streams[name] = data;
      }
    }
  }

  return streams;
}

function findDisplayLists(buffer) {
  const decompressed = decompressOpenSX(buffer);

  for (const [name, data] of Object.entries(decompressed)) {
    if (name.toLowerCase().includes('displaylist') && data.length > 100) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (buf.readUInt32LE(0) === 1 && buf.readUInt32LE(4) === 1) {
        return data;
      }
    }
  }

  return null;
}

// Main analysis
console.log('='.repeat(70));
console.log('EXP-024-CORRECTED: Rejected Candidate Audit (B2 offset fix)');
console.log('='.repeat(70));

const allCandidates = [];

for (const file of FILES) {
  const filePath = path.join(TEST_DIR, file);
  console.log('\n--- File: ' + file + ' ---');

  try {
    const raw = fs.readFileSync(filePath);
    const dl = findDisplayLists(raw);

    if (!dl) {
      console.log('  No DisplayLists found');
      continue;
    }

    const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

    // Find all face markers
    const matches = findAll(dlBuf, FACE_MARKER);
    console.log('  Found ' + matches.length + ' face markers');

    for (const mp of matches) {
      const faceStartOffset = mp - 4;
      if (faceStartOffset < 0) {
        allCandidates.push({ file, mp, category: 'INVALID_OFFSET', ec: null, vc: null });
        continue;
      }

      const edgeCount = dlBuf.readUInt32LE(faceStartOffset);

      if (edgeCount < 1 || edgeCount > 500) {
        allCandidates.push({ file, mp, category: 'INVALID_EC', ec: edgeCount, vc: null });
        continue;
      }

      if (dlBuf.readUInt32LE(mp + 8) !== 2) {
        allCandidates.push({ file, mp, category: 'INVALID_GAP_WORD2', ec: edgeCount, vc: null });
        continue;
      }

      const vertexCount = dlBuf.readUInt32LE(mp + 12);

      if (vertexCount < 3 || vertexCount > 6000) {
        allCandidates.push({ file, mp, category: 'INVALID_VC', ec: edgeCount, vc: vertexCount });
        continue;
      }

      const verticesStart = mp + 16;
      if (verticesStart + vertexCount * 12 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_VERTICES', ec: edgeCount, vc: vertexCount });
        continue;
      }

      // Validate vertex data
      let vertexValid = true;
      for (let i = 0; i < vertexCount; i++) {
        const x = dlBuf.readFloatLE(verticesStart + i * 12);
        if (!isFinite(x) || Math.abs(x) > 1e5) { vertexValid = false; break; }
      }

      if (!vertexValid) {
        allCandidates.push({ file, mp, category: 'INVALID_VERTEX_DATA', ec: edgeCount, vc: vertexCount });
        continue;
      }

      const verticesEnd = verticesStart + vertexCount * 12;
      const gapStart = verticesEnd;

      if (gapStart + 16 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_GAP', ec: edgeCount, vc: vertexCount });
        continue;
      }

      const gap = [
        dlBuf.readUInt32LE(gapStart),
        dlBuf.readUInt32LE(gapStart + 4),
        dlBuf.readUInt32LE(gapStart + 8),
        dlBuf.readUInt32LE(gapStart + 12),
      ];

      if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vertexCount) {
        allCandidates.push({ file, mp, category: 'INVALID_GAP', ec: edgeCount, vc: vertexCount, gap });
        continue;
      }

      const normalsStart = gapStart + 16;
      const normalsEnd = normalsStart + vertexCount * 12;
      const block1Start = normalsEnd;

      // --- CORRECTED: read the full 4-word Block1 header, per INV-005 ---
      if (block1Start + 16 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_B1_HEADER', ec: edgeCount, vc: vertexCount });
        continue;
      }

      const b1Header = [
        dlBuf.readUInt32LE(block1Start),
        dlBuf.readUInt32LE(block1Start + 4),
        dlBuf.readUInt32LE(block1Start + 8),
        dlBuf.readUInt32LE(block1Start + 12),
      ];

      if (b1Header[0] !== 4 || b1Header[1] !== 8 || b1Header[2] !== 2) {
        allCandidates.push({
          file, mp, category: 'INVALID_B1_HEADER_SHAPE', ec: edgeCount, vc: vertexCount, b1Header,
        });
        continue;
      }

      const b1Len = b1Header[3]; // N -- was previously misread as b1Header[0] (always 4)

      if (b1Len < 1 || b1Len > 500000) {
        allCandidates.push({ file, mp, category: 'INVALID_B1_LEN', ec: edgeCount, vc: vertexCount, b1Len });
        continue;
      }

      if (block1Start + 16 + b1Len * 4 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_B1_BODY', ec: edgeCount, vc: vertexCount, b1Len });
        continue;
      }

      const b1Body = [];
      for (let i = 0; i < b1Len; i++) {
        b1Body.push(dlBuf.readUInt32LE(block1Start + 16 + i * 4));
      }

      // --- CORRECTED: Block2 starts at block1Start + (N + 4) * 4 ---
      const block2Start = block1Start + (b1Len + 4) * 4;

      if (block2Start + 16 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_B2_HEADER', ec: edgeCount, vc: vertexCount, b1Len });
        continue;
      }

      const b2Header = [
        dlBuf.readUInt32LE(block2Start),
        dlBuf.readUInt32LE(block2Start + 4),
        dlBuf.readUInt32LE(block2Start + 8),
        dlBuf.readUInt32LE(block2Start + 12),
      ];

      if (b2Header[0] !== 4 || b2Header[1] !== 8 || b2Header[2] !== 2) {
        allCandidates.push({
          file, mp, category: 'INVALID_B2_HEADER_SHAPE', ec: edgeCount, vc: vertexCount, b1Len, b2Header,
        });
        continue;
      }

      const b2Len = b2Header[3]; // M, Block2 body length / section count

      if (b2Len < 1 || b2Len > 100000) {
        allCandidates.push({ file, mp, category: 'INVALID_B2_LEN', ec: edgeCount, vc: vertexCount, b1Len, b2Len });
        continue;
      }

      if (block2Start + 16 + b2Len * 4 > dlBuf.length) {
        allCandidates.push({ file, mp, category: 'OVERFLOW_B2_BODY', ec: edgeCount, vc: vertexCount, b1Len, b2Len });
        continue;
      }

      const b2Body = [];
      for (let i = 0; i < b2Len; i++) {
        b2Body.push(dlBuf.readUInt32LE(block2Start + 16 + i * 4));
      }

      const sectionCount = b2Len; // Block2 entry count

      // Check INV-016: b1len = 2*(vc - secCount)
      const expectedB1Len = 2 * (vertexCount - sectionCount);
      if (b1Len !== expectedB1Len) {
        allCandidates.push({
          file, mp, category: 'INV016_FAIL', ec: edgeCount, vc: vertexCount,
          b1Len, expectedB1Len, secCount: sectionCount,
        });
        continue;
      }

      // Check INV-017: for every ONE-delimited section in B1 body, the
      // body token count equals Block2[i] - 1. Splitting algorithm matches
      // the already-validated v0.4.2a/audit_v042a.js: a ONE both closes the
      // current section (if non-empty) and starts a new one; any trailing
      // partial section after the last ONE is also a real section (the
      // body does not necessarily end on a ONE).
      const sectionLens = [];
      let cur = [];
      for (const v of b1Body) {
        if (v === 1) {
          if (cur.length) sectionLens.push(cur.length);
          cur = [];
        } else {
          cur.push(v);
        }
      }
      if (cur.length) sectionLens.push(cur.length);

      let inv017Pass = sectionLens.length === b2Body.length;
      if (inv017Pass) {
        for (let i = 0; i < sectionLens.length; i++) {
          if (sectionLens[i] !== b2Body[i] - 1) { inv017Pass = false; break; }
        }
      }

      if (!inv017Pass) {
        allCandidates.push({
          file, mp, category: 'INV017_FAIL', ec: edgeCount, vc: vertexCount,
          b1Len, b2Len, sectionLensCount: sectionLens.length,
        });
        continue;
      }

      // Check INV-018: sum(Block2) = b1len
      const b2Sum = b2Body.reduce((a, b) => a + b, 0);

      if (b2Sum !== b1Len) {
        allCandidates.push({
          file, mp, category: 'INV018_FAIL', ec: edgeCount, vc: vertexCount,
          b1Len, b2Len, b2Sum,
        });
        continue;
      }

      // This is a valid face
      allCandidates.push({
        file, mp, category: 'VALID', ec: edgeCount, vc: vertexCount,
        b1Len, b2Len, secCount: sectionCount,
      });
    }

  } catch (e) {
    console.log('  Error: ' + e.message);
  }
}

// Summarize results
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

console.log('\nTotal candidates: ' + allCandidates.length);

// Category distribution
const catDist = {};
for (const c of allCandidates) {
  catDist[c.category] = (catDist[c.category] || 0) + 1;
}
console.log('\nCategory distribution:');
for (const [cat, count] of Object.entries(catDist).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + cat + ': ' + count + ' (' + (100 * count / allCandidates.length).toFixed(1) + '%)');
}

// Valid vs invalid
const valid = allCandidates.filter(c => c.category === 'VALID');
const invalid = allCandidates.filter(c => c.category !== 'VALID');
console.log('\nValid: ' + valid.length + ' (' + (100 * valid.length / allCandidates.length).toFixed(1) + '%)');
console.log('Invalid: ' + invalid.length + ' (' + (100 * invalid.length / allCandidates.length).toFixed(1) + '%)');

// Per-file summary
console.log('\nPer-file summary:');
const fileStats = {};
for (const c of allCandidates) {
  if (!fileStats[c.file]) fileStats[c.file] = { total: 0, valid: 0, categories: {} };
  fileStats[c.file].total++;
  if (c.category === 'VALID') fileStats[c.file].valid++;
  fileStats[c.file].categories[c.category] = (fileStats[c.file].categories[c.category] || 0) + 1;
}
for (const [file, stats] of Object.entries(fileStats)) {
  console.log('  ' + file + ': ' + stats.total + ' candidates, ' + stats.valid + ' valid');
  for (const [cat, count] of Object.entries(stats.categories)) {
    if (cat !== 'VALID') {
      console.log('    ' + cat + ': ' + count);
    }
  }
}

// Save results
const outputPath = path.join(RESEARCH_DIR, 'v0.4.5', 'EXP024_RESULTS_CORRECTED.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  experiment: 'EXP-024-CORRECTED',
  supersedesEvidenceOnly: 'v0.4.4/EXP024_RESULTS.json (not overwritten, retained as historical record)',
  correction: 'Block2 offset computed as block1Start + (N+4)*4 where N is read from block1Start+12 (true Block1 header 4th word), instead of the original bug which misread the header first word (always 4) as N and computed block1Start + 4*4. B1/B2 header shape ([4,8,2,N]/[4,8,2,M]) now validated explicitly per INV-005/INV-006. INV-016/017/018 now use real Block1/Block2 body data.',
  totalCandidates: allCandidates.length,
  validCandidates: valid.length,
  invalidCandidates: invalid.length,
  categoryDistribution: catDist,
  perFile: fileStats,
  candidates: allCandidates,
}, null, 2));

console.log('\nResults saved to: ' + outputPath);
