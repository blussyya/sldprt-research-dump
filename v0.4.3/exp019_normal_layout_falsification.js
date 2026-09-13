#!/usr/bin/env node
/**
 * EXP-019: Normal/Layout Falsification
 *
 * Objective: Try to falsify the current face layout model.
 *
 * Attempt to falsify:
 *   1. Normals immediately follow the gap
 *   2. Gap is always exactly 16 bytes
 *   3. Block 1 always begins immediately after normals
 *   4. There are no alternative valid Block 1 headers nearby
 *
 * This is the highest priority experiment. The objective is to break the model if possible.
 *
 * Version: v0.4.3
 * Date: 2026-07-16
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESEARCH_DIR = 'C:/Users/basha/Desktop/soldiworks research';
const EPSILON = 0.001; // tolerance for normal magnitude check

// --- OpenSX Decompression ---

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

/**
 * Extract faces with full layout verification.
 */
function extractFacesWithLayout(displayLists) {
  const faces = [];
  const matches = findAll(displayLists, FACE_MARKER);

  for (const mp of matches) {
    const faceStartOffset = mp - 4;
    if (faceStartOffset < 0) continue;

    const edgeCount = displayLists.readUInt32LE(faceStartOffset);
    if (edgeCount < 1 || edgeCount > 500) continue;
    if (displayLists.readUInt32LE(mp + 8) !== 2) continue;
    const vertexCount = displayLists.readUInt32LE(mp + 12);
    if (vertexCount < 3 || vertexCount > 6000) continue;

    const verticesStart = mp + 16;
    if (verticesStart + vertexCount * 12 > displayLists.length) continue;

    // Validate vertex floats
    let ok = true;
    for (let i = 0; i < vertexCount; i++) {
      const x = displayLists.readFloatLE(verticesStart + i * 12);
      if (!isFinite(x) || Math.abs(x) > 1e5) { ok = false; break; }
    }
    if (!ok) continue;

    // Read vertices
    const vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      vertices.push([
        displayLists.readFloatLE(verticesStart + i * 12),
        displayLists.readFloatLE(verticesStart + i * 12 + 4),
        displayLists.readFloatLE(verticesStart + i * 12 + 8),
      ]);
    }

    const verticesEnd = verticesStart + vertexCount * 12;
    const gapStart = verticesEnd;

    // Read gap
    if (gapStart + 16 > displayLists.length) continue;
    const gap = [
      displayLists.readUInt32LE(gapStart),
      displayLists.readUInt32LE(gapStart + 4),
      displayLists.readUInt32LE(gapStart + 8),
      displayLists.readUInt32LE(gapStart + 12),
    ];
    if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vertexCount) continue;

    const normalsStart = gapStart + 16;
    const normalsEnd = normalsStart + vertexCount * 12;

    // Read normals
    if (normalsEnd > displayLists.length) continue;
    const normals = [];
    for (let i = 0; i < vertexCount; i++) {
      normals.push([
        displayLists.readFloatLE(normalsStart + i * 12),
        displayLists.readFloatLE(normalsStart + i * 12 + 4),
        displayLists.readFloatLE(normalsStart + i * 12 + 8),
      ]);
    }

    const block1Start = normalsEnd;

    // Read B1 header
    if (block1Start + 16 > displayLists.length) continue;
    const b1Header = [
      displayLists.readUInt32LE(block1Start),
      displayLists.readUInt32LE(block1Start + 4),
      displayLists.readUInt32LE(block1Start + 8),
      displayLists.readUInt32LE(block1Start + 12),
    ];
    if (b1Header[0] !== 4 || b1Header[1] !== 8 || b1Header[2] !== 2) continue;
    const b1Len = b1Header[3];
    if (b1Len < 1 || b1Len > 500000) continue;
    if (block1Start + 16 + b1Len * 4 > displayLists.length) continue;

    // Read B1 body
    const b1Body = [];
    for (let i = 0; i < b1Len; i++) {
      b1Body.push(displayLists.readUInt32LE(block1Start + 16 + i * 4));
    }

    const block2Start = block1Start + (b1Len + 4) * 4;
    let b2Header = null;
    let b2Body = [];
    if (block2Start + 16 <= displayLists.length) {
      b2Header = [
        displayLists.readUInt32LE(block2Start),
        displayLists.readUInt32LE(block2Start + 4),
        displayLists.readUInt32LE(block2Start + 8),
        displayLists.readUInt32LE(block2Start + 12),
      ];
      if (b2Header[0] === 4 && b2Header[1] === 8 && b2Header[2] === 2) {
        const b2Len = b2Header[3];
        if (b2Len > 0 && b2Len <= 100000 && block2Start + 16 + b2Len * 4 <= displayLists.length) {
          for (let i = 0; i < b2Len; i++) {
            b2Body.push(displayLists.readUInt32LE(block2Start + 16 + i * 4));
          }
        }
      }
    }

    faces.push({
      faceStartOffset,
      edgeCount,
      vertexCount,
      verticesStart,
      verticesEnd,
      gapStart,
      gap,
      normalsStart,
      normalsEnd,
      block1Start,
      b1Header,
      b1Len,
      b1Body,
      block2Start,
      b2Header,
      b2Body,
      vertices,
      normals,
    });
  }
  return faces;
}

/**
 * Test 1: Verify normals are unit vectors.
 */
function testNormalUnitLength(faces) {
  const results = {
    totalFaces: faces.length,
    pass: 0,
    fail: 0,
    maxDeviation: 0,
    failures: [],
  };

  for (const face of faces) {
    let faceMaxDev = 0;
    let facePass = true;

    for (let i = 0; i < face.normals.length; i++) {
      const [nx, ny, nz] = face.normals[i];
      const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const dev = Math.abs(mag - 1.0);
      if (dev > faceMaxDev) faceMaxDev = dev;
      if (dev > EPSILON) {
        facePass = false;
      }
    }

    if (facePass) {
      results.pass++;
    } else {
      results.fail++;
      if (results.failures.length < 10) {
        results.failures.push({
          faceStart: '0x' + face.faceStartOffset.toString(16),
          vc: face.vertexCount,
          maxDeviation: faceMaxDev,
        });
      }
    }

    if (faceMaxDev > results.maxDeviation) {
      results.maxDeviation = faceMaxDev;
    }
  }

  return results;
}

/**
 * Test 2: Search for alternative [4,8,2,N] patterns near expected B1 position.
 */
function testAlternativeB1Positions(displayLists, faces) {
  const results = {
    totalFaces: faces.length,
    onlyExpected: 0,
    multipleFound: 0,
    alternatives: [],
  };

  const SEARCH_RANGE = 128; // bytes to search in each direction

  for (const face of faces) {
    const expectedB1 = face.block1Start;
    const searchStart = Math.max(0, expectedB1 - SEARCH_RANGE);
    const searchEnd = Math.min(displayLists.length - 16, expectedB1 + SEARCH_RANGE);

    const candidates = [];
    for (let pos = searchStart; pos <= searchEnd; pos += 4) {
      if (pos === expectedB1) continue; // skip expected position
      const h = [
        displayLists.readUInt32LE(pos),
        displayLists.readUInt32LE(pos + 4),
        displayLists.readUInt32LE(pos + 8),
        displayLists.readUInt32LE(pos + 12),
      ];
      if (h[0] === 4 && h[1] === 8 && h[2] === 2 && h[3] > 0 && h[3] <= 500000) {
        candidates.push({
          offset: pos,
          delta: pos - expectedB1,
          header: h,
        });
      }
    }

    if (candidates.length === 0) {
      results.onlyExpected++;
    } else {
      results.multipleFound++;
      if (results.alternatives.length < 10) {
        results.alternatives.push({
          faceStart: '0x' + face.faceStartOffset.toString(16),
          expectedB1: '0x' + expectedB1.toString(16),
          alternatives: candidates.slice(0, 5),
        });
      }
    }
  }

  return results;
}

/**
 * Test 3: Check for non-zero bytes between normals and B1.
 */
function testNoExtraBytes(displayLists, faces) {
  const results = {
    totalFaces: faces.length,
    clean: 0,
    hasExtraBytes: 0,
    examples: [],
  };

  for (const face of faces) {
    // Check bytes between normalsEnd and block1Start (should be 0 bytes)
    const gap = face.normalsEnd - face.block1Start;
    if (gap !== 0) {
      results.hasExtraBytes++;
      if (results.examples.length < 10) {
        results.examples.push({
          faceStart: '0x' + face.faceStartOffset.toString(16),
          normalsEnd: face.normalsEnd,
          block1Start: face.block1Start,
          gap: gap,
        });
      }
    } else {
      results.clean++;
    }
  }

  return results;
}

/**
 * Test 4: Verify gap is exactly 16 bytes.
 */
function testGapSize(faces) {
  const results = {
    totalFaces: faces.length,
    is16Bytes: 0,
    not16Bytes: 0,
    examples: [],
  };

  for (const face of faces) {
    const gapSize = face.normalsStart - face.gapStart;
    if (gapSize === 16) {
      results.is16Bytes++;
    } else {
      results.not16Bytes++;
      if (results.examples.length < 10) {
        results.examples.push({
          faceStart: '0x' + face.faceStartOffset.toString(16),
          gapStart: face.gapStart,
          normalsStart: face.normalsStart,
          gapSize: gapSize,
        });
      }
    }
  }

  return results;
}

/**
 * Test 5: Verify block ordering (positions -> gap -> normals -> B1 -> B2).
 */
function testBlockOrdering(faces) {
  const results = {
    totalFaces: faces.length,
    correctOrder: 0,
    incorrectOrder: 0,
    examples: [],
  };

  for (const face of faces) {
    const correct = face.verticesStart < face.gapStart &&
                    face.gapStart < face.normalsStart &&
                    face.normalsStart < face.block1Start &&
                    face.block1Start < face.block2Start;

    if (correct) {
      results.correctOrder++;
    } else {
      results.incorrectOrder++;
      if (results.examples.length < 10) {
        results.examples.push({
          faceStart: '0x' + face.faceStartOffset.toString(16),
          verticesStart: face.verticesStart,
          gapStart: face.gapStart,
          normalsStart: face.normalsStart,
          block1Start: face.block1Start,
          block2Start: face.block2Start,
        });
      }
    }
  }

  return results;
}

// --- Main ---

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
console.log('EXP-019: Normal/Layout Falsification');
console.log('Objective: Try to break the current face layout model');
console.log('='.repeat(70));

let allFaces = [];
const testResults = {};

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED'); continue; }

  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  const faces = extractFacesWithLayout(dlBuf);
  console.log('  Faces extracted: ' + faces.length);
  allFaces = allFaces.concat(faces);

  // Run tests
  const normalTest = testNormalUnitLength(faces);
  const altB1Test = testAlternativeB1Positions(dlBuf, faces);
  const extraBytesTest = testNoExtraBytes(dlBuf, faces);
  const gapSizeTest = testGapSize(faces);
  const orderingTest = testBlockOrdering(faces);

  console.log('  Normal unit-length: ' + normalTest.pass + '/' + normalTest.totalFaces + ' pass, max dev=' + normalTest.maxDeviation.toFixed(6));
  console.log('  Alternative B1: only expected=' + altB1Test.onlyExpected + ', multiple=' + altB1Test.multipleFound);
  console.log('  Extra bytes: clean=' + extraBytesTest.clean + ', has extra=' + extraBytesTest.hasExtraBytes);
  console.log('  Gap size 16: ' + gapSizeTest.is16Bytes + '/' + gapSizeTest.totalFaces);
  console.log('  Block ordering: correct=' + orderingTest.correctOrder + '/' + orderingTest.totalFaces);

  testResults[file.shortName] = {
    faceCount: faces.length,
    normalTest,
    altB1Test,
    extraBytesTest,
    gapSizeTest,
    orderingTest,
  };
}

// Aggregate results
console.log('\n' + '='.repeat(70));
console.log('AGGREGATE RESULTS');
console.log('='.repeat(70));

let totalFaces = 0;
let totalNormalPass = 0;
let totalNormalFail = 0;
let totalAltB1Only = 0;
let totalAltB1Multiple = 0;
let totalExtraClean = 0;
let totalExtraBytes = 0;
let totalGap16 = 0;
let totalOrderCorrect = 0;
let maxDeviation = 0;

for (const [file, results] of Object.entries(testResults)) {
  totalFaces += results.faceCount;
  totalNormalPass += results.normalTest.pass;
  totalNormalFail += results.normalTest.fail;
  totalAltB1Only += results.altB1Test.onlyExpected;
  totalAltB1Multiple += results.altB1Test.multipleFound;
  totalExtraClean += results.extraBytesTest.clean;
  totalExtraBytes += results.extraBytesTest.hasExtraBytes;
  totalGap16 += results.gapSizeTest.is16Bytes;
  totalOrderCorrect += results.orderingTest.correctOrder;
  if (results.normalTest.maxDeviation > maxDeviation) {
    maxDeviation = results.normalTest.maxDeviation;
  }
}

console.log('Total faces: ' + totalFaces);
console.log('');
console.log('Test 1: Normal unit-length (ε=' + EPSILON + ')');
console.log('  PASS: ' + totalNormalPass + '/' + totalFaces);
console.log('  FAIL: ' + totalNormalFail + '/' + totalFaces);
console.log('  Max deviation: ' + maxDeviation.toFixed(6));
console.log('');
console.log('Test 2: Alternative B1 positions (±128 bytes)');
console.log('  Only expected: ' + totalAltB1Only + '/' + totalFaces);
console.log('  Multiple found: ' + totalAltB1Multiple + '/' + totalFaces);
console.log('');
console.log('Test 3: No extra bytes between normals and B1');
console.log('  Clean: ' + totalExtraClean + '/' + totalFaces);
console.log('  Has extra bytes: ' + totalExtraBytes + '/' + totalFaces);
console.log('');
console.log('Test 4: Gap is exactly 16 bytes');
console.log('  Is 16 bytes: ' + totalGap16 + '/' + totalFaces);
console.log('');
console.log('Test 5: Block ordering (positions < gap < normals < B1 < B2)');
console.log('  Correct: ' + totalOrderCorrect + '/' + totalFaces);

// Falsification summary
console.log('\n' + '='.repeat(70));
console.log('FALSIFICATION SUMMARY');
console.log('='.repeat(70));

const falsified = [];
const survived = [];

if (totalNormalFail > 0) {
  falsified.push('H1: Normals are unit vectors — ' + totalNormalFail + ' faces failed');
} else {
  survived.push('H1: Normals are unit vectors — ' + totalFaces + '/' + totalFaces + ' pass');
}

if (totalAltB1Multiple > 0) {
  falsified.push('H4: No alternative B1 positions — ' + totalAltB1Multiple + ' faces have alternatives');
} else {
  survived.push('H4: No alternative B1 positions — ' + totalFaces + '/' + totalFaces + ' pass');
}

if (totalExtraBytes > 0) {
  falsified.push('H2: No extra bytes between normals and B1 — ' + totalExtraBytes + ' faces have extra bytes');
} else {
  survived.push('H2: No extra bytes between normals and B1 — ' + totalFaces + '/' + totalFaces + ' pass');
}

if (totalGap16 < totalFaces) {
  falsified.push('H3: Gap is exactly 16 bytes — ' + (totalFaces - totalGap16) + ' faces have different gap size');
} else {
  survived.push('H3: Gap is exactly 16 bytes — ' + totalFaces + '/' + totalFaces + ' pass');
}

if (totalOrderCorrect < totalFaces) {
  falsified.push('H5: Block ordering is correct — ' + (totalFaces - totalOrderCorrect) + ' faces have incorrect ordering');
} else {
  survived.push('H5: Block ordering is correct — ' + totalFaces + '/' + totalFaces + ' pass');
}

console.log('\nSURVIVED:');
for (const s of survived) console.log('  ✓ ' + s);

if (falsified.length > 0) {
  console.log('\nFALSIFIED:');
  for (const f of falsified) console.log('  ✗ ' + f);
} else {
  console.log('\nNo hypotheses falsified.');
}

// Write JSON
const output = {
  meta: {
    version: 'v0.4.3',
    experiment: 'EXP-019',
    description: 'Normal/Layout falsification',
    date: new Date().toISOString(),
    epsilon: EPSILON,
    totalFaces,
  },
  aggregate: {
    normalUnitTest: { pass: totalNormalPass, fail: totalNormalFail, maxDeviation },
    altB1Test: { onlyExpected: totalAltB1Only, multipleFound: totalAltB1Multiple },
    extraBytesTest: { clean: totalExtraClean, hasExtraBytes: totalExtraBytes },
    gapSizeTest: { is16Bytes: totalGap16 },
    blockOrderingTest: { correct: totalOrderCorrect },
  },
  survived,
  falsified,
  perFile: testResults,
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.3', 'EXP019_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.3/EXP019_RESULTS.json');
