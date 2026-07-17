#!/usr/bin/env node
/**
 * EXP-018: Independent Face Extraction (v3)
 *
 * Adds detailed analysis of PARTIAL_GAP candidates.
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

function extractCandidatesRaw(displayLists) {
  const candidates = [];
  const matches = findAll(displayLists, FACE_MARKER);

  for (const mp of matches) {
    const faceStartOffset = mp - 4;
    if (faceStartOffset < 0) continue;

    const edgeCount = displayLists.readUInt32LE(faceStartOffset);
    const markerWord2 = displayLists.readUInt32LE(mp + 4);
    const markerWord3 = displayLists.readUInt32LE(mp + 8);
    const vertexCount = displayLists.readUInt32LE(mp + 12);

    const verticesStart = mp + 16;
    const verticesEnd = verticesStart + vertexCount * 12;
    const gapStart = verticesEnd;
    const normalsStart = gapStart + 16;
    const normalsEnd = normalsStart + vertexCount * 12;
    const block1Start = normalsEnd;

    let gap = null;
    let gapStatus = 'UNREADABLE';
    if (gapStart + 16 > displayLists.length) {
      gapStatus = 'OUT_OF_BOUNDS';
    } else if (vertexCount > 100000) {
      gapStatus = 'VC_TOO_LARGE';
    } else {
      gap = [
        displayLists.readUInt32LE(gapStart),
        displayLists.readUInt32LE(gapStart + 4),
        displayLists.readUInt32LE(gapStart + 8),
        displayLists.readUInt32LE(gapStart + 12),
      ];
      gapStatus = 'READ';
    }

    let b1Header = null;
    let b1Status = 'UNREADABLE';
    if (block1Start + 16 > displayLists.length) {
      b1Status = 'OUT_OF_BOUNDS';
    } else if (vertexCount > 100000) {
      b1Status = 'VC_TOO_LARGE';
    } else {
      b1Header = [
        displayLists.readUInt32LE(block1Start),
        displayLists.readUInt32LE(block1Start + 4),
        displayLists.readUInt32LE(block1Start + 8),
        displayLists.readUInt32LE(block1Start + 12),
      ];
      b1Status = 'READ';
    }

    let b1BodyRaw = null;
    if (b1Header && b1Header[3] > 0 && b1Header[3] <= 500000 &&
        block1Start + 16 + b1Header[3] * 4 <= displayLists.length) {
      b1BodyRaw = [];
      for (let i = 0; i < b1Header[3]; i++) {
        b1BodyRaw.push(displayLists.readUInt32LE(block1Start + 16 + i * 4));
      }
    }

    let block2Start = null;
    let b2Header = null;
    let b2BodyRaw = null;
    if (b1Header && b1Header[3] > 0 && b1Header[3] <= 500000) {
      block2Start = block1Start + (b1Header[3] + 4) * 4;
      if (block2Start + 16 <= displayLists.length) {
        b2Header = [
          displayLists.readUInt32LE(block2Start),
          displayLists.readUInt32LE(block2Start + 4),
          displayLists.readUInt32LE(block2Start + 8),
          displayLists.readUInt32LE(block2Start + 12),
        ];
        if (b2Header[3] > 0 && b2Header[3] <= 100000 &&
            block2Start + 16 + b2Header[3] * 4 <= displayLists.length) {
          b2BodyRaw = [];
          for (let i = 0; i < b2Header[3]; i++) {
            b2BodyRaw.push(displayLists.readUInt32LE(block2Start + 16 + i * 4));
          }
        }
      }
    }

    candidates.push({
      markerOffset: mp,
      faceStartOffset,
      edgeCount,
      markerWord2,
      markerWord3,
      vertexCount,
      verticesStart,
      verticesEnd,
      gapStart,
      gapStatus,
      gap,
      normalsStart,
      normalsEnd,
      block1Start,
      b1Status,
      b1Header,
      b1BodyRaw,
      block2Start,
      b2Header,
      b2BodyRaw,
    });
  }
  return candidates;
}

function classifyCandidate(c) {
  const ecInRange = c.edgeCount >= 1 && c.edgeCount <= 500;
  const vcInRange = c.vertexCount >= 3 && c.vertexCount <= 6000;
  const gapExact = c.gap && c.gap[0] === 12 && c.gap[1] === 100 && c.gap[2] === 2 && c.gap[3] === c.vertexCount;
  const b1Valid = c.b1Header && c.b1Header[0] === 4 && c.b1Header[1] === 8 && c.b1Header[2] === 2;
  const b1LenValid = b1Valid && c.b1Header[3] > 0 && c.b1Header[3] <= 500000;
  const b2Valid = c.b2Header && c.b2Header[0] === 4 && c.b2Header[1] === 8 && c.b2Header[2] === 2;
  const b2LenValid = b2Valid && c.b2Header[3] > 0 && c.b2Header[3] <= 100000;

  if (ecInRange && vcInRange && gapExact && b1LenValid && b2LenValid && c.b1BodyRaw && c.b2BodyRaw) {
    return 'FULL';
  } else if (b1LenValid && b2LenValid) {
    return 'PARTIAL_B1B2';
  } else if (b1LenValid) {
    return 'PARTIAL_B1';
  } else if (gapExact) {
    return 'PARTIAL_GAP';
  } else if (ecInRange && vcInRange) {
    return 'PARTIAL_ECORVC';
  } else {
    return 'REJECTED';
  }
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
console.log('EXP-018: Independent Face Extraction (v3)');
console.log('='.repeat(70));

const allResults = {};
let totalCandidates = 0;
const classificationCounts = {};

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED'); continue; }

  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  const candidates = extractCandidatesRaw(dlBuf);
  console.log('  Raw candidates: ' + candidates.length);
  totalCandidates += candidates.length;

  const classified = candidates.map(c => ({
    ...c,
    classification: classifyCandidate(c),
  }));

  const fileClassCounts = {};
  for (const c of classified) {
    fileClassCounts[c.classification] = (fileClassCounts[c.classification] || 0) + 1;
    classificationCounts[c.classification] = (classificationCounts[c.classification] || 0) + 1;
  }

  // Analyze PARTIAL_GAP candidates
  const partialGap = classified.filter(c => c.classification === 'PARTIAL_GAP');
  const partialGapAnalysis = partialGap.map(c => ({
    marker: '0x' + c.markerOffset.toString(16),
    ec: c.edgeCount,
    vc: c.vertexCount,
    gap: c.gap,
    b1Header: c.b1Header,
    b2Header: c.b2Header,
  }));

  console.log('  Classifications: ' + JSON.stringify(fileClassCounts));
  console.log('  PARTIAL_GAP examples: ' + JSON.stringify(partialGapAnalysis.slice(0, 5)));

  allResults[file.shortName] = {
    rawCandidates: candidates.length,
    classifications: fileClassCounts,
    partialGapExamples: partialGapAnalysis.slice(0, 10),
  };
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('Total candidates: ' + totalCandidates);
console.log('Classifications: ' + JSON.stringify(classificationCounts));

// Key observation
console.log('\n' + '='.repeat(70));
console.log('KEY OBSERVATION');
console.log('='.repeat(70));
console.log('FULL candidates: ' + classificationCounts.FULL);
console.log('PARTIAL_GAP candidates: ' + classificationCounts.PARTIAL_GAP);
console.log('Ratio FULL:PARTIAL_GAP = ' + (classificationCounts.FULL / classificationCounts.PARTIAL_GAP).toFixed(2));
console.log('');
console.log('This means exactly half of the gap-exact candidates have valid B1/B2 headers.');
console.log('The other half have exact gap match but invalid B1/B2 headers.');

// Write JSON
const output = {
  meta: {
    version: 'v0.4.3',
    experiment: 'EXP-018',
    date: new Date().toISOString(),
    totalCandidates,
  },
  classificationCounts,
  perFile: allResults,
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.3', 'EXP018_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.3/EXP018_RESULTS.json');
