#!/usr/bin/env node
/**
 * EXP-021: Alternative [4,8,2,N] Header Investigation
 *
 * Objective: Investigate the alternative [4,8,2,N] headers found in EXP-019.
 *            Treat every alternative as potentially meaningful.
 *            Do not assume they are false positives.
 *
 * Determine:
 *   - Total number of alternative headers
 *   - Values of N
 *   - Distribution of N
 *   - Relative offset from the true Block 1
 *   - Whether they always occur before or after the true Block 1
 *   - Whether every face has one
 *   - Whether multiple alternatives exist per face
 *   - Correlation with vertex count, edge count, B1 length, B2 length, section count, file
 *
 * Version: v0.4.3
 * Date: 2026-07-16
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESEARCH_DIR = 'C:/Users/basha/Desktop/soldiworks research';
const SEARCH_RANGE = 256; // bytes to search in each direction from true B1

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
 * Extract faces with full metadata for correlation analysis.
 */
function extractFacesWithMetadata(displayLists) {
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

    // Read normals (verify unit length)
    if (normalsEnd > displayLists.length) continue;
    let normalsOk = true;
    for (let i = 0; i < vertexCount; i++) {
      const nx = displayLists.readFloatLE(normalsStart + i * 12);
      const ny = displayLists.readFloatLE(normalsStart + i * 12 + 4);
      const nz = displayLists.readFloatLE(normalsStart + i * 12 + 8);
      const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (Math.abs(mag - 1.0) > 0.001) { normalsOk = false; break; }
    }
    if (!normalsOk) continue;

    const block1Start = normalsEnd;

    // Read true B1 header
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

    // Count sections (ONE-delimited)
    const sectionCount = b1Body.filter(v => v === 1).length;

    // Read B2 header
    const block2Start = block1Start + (b1Len + 4) * 4;
    let b2Header = null;
    let b2Len = 0;
    let b2Body = [];
    if (block2Start + 16 <= displayLists.length) {
      b2Header = [
        displayLists.readUInt32LE(block2Start),
        displayLists.readUInt32LE(block2Start + 4),
        displayLists.readUInt32LE(block2Start + 8),
        displayLists.readUInt32LE(block2Start + 12),
      ];
      if (b2Header[0] === 4 && b2Header[1] === 8 && b2Header[2] === 2) {
        b2Len = b2Header[3];
        if (b2Len > 0 && b2Len <= 100000 && block2Start + 16 + b2Len * 4 <= displayLists.length) {
          for (let i = 0; i < b2Len; i++) {
            b2Body.push(displayLists.readUInt32LE(block2Start + 16 + i * 4));
          }
        }
      }
    }

    // Search for alternative [4,8,2,N] headers
    const alternatives = [];
    const searchStart = Math.max(0, block1Start - SEARCH_RANGE);
    const searchEnd = Math.min(displayLists.length - 16, block1Start + b1Len * 4 + 16 + (b2Len > 0 ? b2Len * 4 + 16 : 0) + SEARCH_RANGE);

    for (let pos = searchStart; pos <= searchEnd; pos += 4) {
      if (pos === block1Start) continue; // skip true B1 position

      const h = [
        displayLists.readUInt32LE(pos),
        displayLists.readUInt32LE(pos + 4),
        displayLists.readUInt32LE(pos + 8),
        displayLists.readUInt32LE(pos + 12),
      ];

      if (h[0] === 4 && h[1] === 8 && h[2] === 2 && h[3] > 0 && h[3] <= 500000) {
        // This is a valid [4,8,2,N] pattern
        const delta = pos - block1Start;
        const direction = delta < 0 ? 'BEFORE' : 'AFTER';

        // Check if this could be a valid B2 header
        const isB2 = (pos === block2Start);

        // Check if this overlaps with the true B1 body
        const overlapsB1 = (pos >= block1Start && pos < block1Start + 16 + b1Len * 4);

        // Check if this overlaps with the true B2 body
        const overlapsB2 = (pos >= block2Start && pos < block2Start + 16 + b2Len * 4);

        alternatives.push({
          offset: pos,
          delta,
          direction,
          header: h,
          n: h[3],
          isB2,
          overlapsB1,
          overlapsB2,
        });
      }
    }

    faces.push({
      faceStartOffset,
      edgeCount,
      vertexCount,
      block1Start,
      b1Header,
      b1Len,
      sectionCount,
      block2Start,
      b2Header,
      b2Len,
      alternatives,
    });
  }
  return faces;
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
console.log('EXP-021: Alternative [4,8,2,N] Header Investigation');
console.log('='.repeat(70));

const allFaces = [];
const fileResults = {};

for (const file of CORPUS) {
  console.log('\n--- ' + file.shortName + ' ---');
  if (!fs.existsSync(file.path)) { console.log('  SKIPPED'); continue; }

  const raw = fs.readFileSync(file.path);
  let dl;
  try { dl = findDisplayLists(raw); } catch (e) { console.log('  ERROR: ' + e.message); continue; }
  if (!dl) { console.log('  No DisplayLists'); continue; }
  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

  const faces = extractFacesWithMetadata(dlBuf);
  console.log('  Faces: ' + faces.length);

  // Per-file statistics
  const fileStats = {
    faceCount: faces.length,
    totalAlternatives: 0,
    facesWithAlternatives: 0,
    facesWithMultiple: 0,
    nValues: {},
    directionCounts: { BEFORE: 0, AFTER: 0 },
    b2Count: 0,
    overlapsB1Count: 0,
    overlapsB2Count: 0,
  };

  for (const face of faces) {
    allFaces.push({ ...face, file: file.shortName });

    // Filter out true B2 from alternatives
    const nonB2Alts = face.alternatives.filter(a => !a.isB2);

    fileStats.totalAlternatives += nonB2Alts.length;
    if (nonB2Alts.length > 0) fileStats.facesWithAlternatives++;
    if (nonB2Alts.length > 1) fileStats.facesWithMultiple++;

    for (const alt of nonB2Alts) {
      fileStats.nValues[alt.n] = (fileStats.nValues[alt.n] || 0) + 1;
      fileStats.directionCounts[alt.direction]++;
      if (alt.overlapsB1) fileStats.overlapsB1Count++;
      if (alt.overlapsB2) fileStats.overlapsB2Count++;
    }

    // Also count B2 headers
    const b2Alts = face.alternatives.filter(a => a.isB2);
    fileStats.b2Count += b2Alts.length;
  }

  console.log('  Total alternatives (non-B2): ' + fileStats.totalAlternatives);
  console.log('  Faces with alternatives: ' + fileStats.facesWithAlternatives);
  console.log('  Faces with multiple: ' + fileStats.facesWithMultiple);
  console.log('  N values: ' + JSON.stringify(fileStats.nValues));
  console.log('  Direction: ' + JSON.stringify(fileStats.directionCounts));

  fileResults[file.shortName] = fileStats;
}

// Aggregate analysis
console.log('\n' + '='.repeat(70));
console.log('AGGREGATE ANALYSIS');
console.log('='.repeat(70));

let totalFaces = 0;
let totalAlternatives = 0;
let facesWithAlternatives = 0;
let facesWithMultiple = 0;
const nValueDistribution = {};
const directionCounts = { BEFORE: 0, AFTER: 0 };
const deltaDistribution = {};
const nByDirection = { BEFORE: {}, AFTER: {} };

// Correlation data
const correlationData = [];

for (const face of allFaces) {
  totalFaces++;

  // Filter out true B2
  const nonB2Alts = face.alternatives.filter(a => !a.isB2);

  totalAlternatives += nonB2Alts.length;
  if (nonB2Alts.length > 0) facesWithAlternatives++;
  if (nonB2Alts.length > 1) facesWithMultiple++;

  for (const alt of nonB2Alts) {
    nValueDistribution[alt.n] = (nValueDistribution[alt.n] || 0) + 1;
    directionCounts[alt.direction]++;

    const deltaKey = alt.delta;
    deltaDistribution[deltaKey] = (deltaDistribution[deltaKey] || 0) + 1;

    if (!nByDirection[alt.direction][alt.n]) nByDirection[alt.direction][alt.n] = 0;
    nByDirection[alt.direction][alt.n]++;

    correlationData.push({
      file: face.file,
      vertexCount: face.vertexCount,
      edgeCount: face.edgeCount,
      b1Len: face.b1Len,
      b2Len: face.b2Len,
      sectionCount: face.sectionCount,
      altN: alt.n,
      altDelta: alt.delta,
      altDirection: alt.direction,
    });
  }
}

console.log('Total faces: ' + totalFaces);
console.log('Total alternatives (non-B2): ' + totalAlternatives);
console.log('Faces with alternatives: ' + facesWithAlternatives + ' (' + (facesWithAlternatives / totalFaces * 100).toFixed(1) + '%)');
console.log('Faces with multiple: ' + facesWithMultiple + ' (' + (facesWithMultiple / totalFaces * 100).toFixed(1) + '%)');
console.log('');
console.log('N value distribution:');
for (const [n, count] of Object.entries(nValueDistribution).sort((a, b) => a[0] - b[0])) {
  console.log('  N=' + n + ': ' + count + ' (' + (count / totalAlternatives * 100).toFixed(1) + '%)');
}
console.log('');
console.log('Direction distribution:');
console.log('  BEFORE: ' + directionCounts.BEFORE + ' (' + (directionCounts.BEFORE / totalAlternatives * 100).toFixed(1) + '%)');
console.log('  AFTER: ' + directionCounts.AFTER + ' (' + (directionCounts.AFTER / totalAlternatives * 100).toFixed(1) + '%)');
console.log('');
console.log('N by direction:');
console.log('  BEFORE: ' + JSON.stringify(nByDirection.BEFORE));
console.log('  AFTER: ' + JSON.stringify(nByDirection.AFTER));
console.log('');
console.log('Delta distribution (top 20):');
const sortedDeltas = Object.entries(deltaDistribution).sort((a, b) => b[1] - a[1]);
for (let i = 0; i < Math.min(20, sortedDeltas.length); i++) {
  console.log('  delta=' + sortedDeltas[i][0] + ': ' + sortedDeltas[i][1]);
}

// Correlation analysis
console.log('\n' + '='.repeat(70));
console.log('CORRELATION ANALYSIS');
console.log('='.repeat(70));

// Group by N value and compute averages
const byN = {};
for (const d of correlationData) {
  if (!byN[d.altN]) byN[d.altN] = { count: 0, vcSum: 0, ecSum: 0, b1Sum: 0, b2Sum: 0, secSum: 0 };
  byN[d.altN].count++;
  byN[d.altN].vcSum += d.vertexCount;
  byN[d.altN].ecSum += d.edgeCount;
  byN[d.altN].b1Sum += d.b1Len;
  byN[d.altN].b2Sum += d.b2Len;
  byN[d.altN].secSum += d.sectionCount;
}

console.log('Average face properties by alternative N value:');
console.log('N\tCount\tAvgVC\tAvgEC\tAvgB1\tAvgB2\tAvgSec');
for (const [n, stats] of Object.entries(byN).sort((a, b) => a[0] - b[0])) {
  console.log(n + '\t' + stats.count + '\t' +
    (stats.vcSum / stats.count).toFixed(1) + '\t' +
    (stats.ecSum / stats.count).toFixed(1) + '\t' +
    (stats.b1Sum / stats.count).toFixed(1) + '\t' +
    (stats.b2Sum / stats.count).toFixed(1) + '\t' +
    (stats.secSum / stats.count).toFixed(1));
}

// Group by file
console.log('\nAlternatives by file:');
const byFile = {};
for (const d of correlationData) {
  if (!byFile[d.file]) byFile[d.file] = { count: 0, nValues: {} };
  byFile[d.file].count++;
  byFile[d.file].nValues[d.altN] = (byFile[d.file].nValues[d.altN] || 0) + 1;
}
for (const [file, stats] of Object.entries(byFile)) {
  console.log('  ' + file + ': ' + stats.count + ' alternatives, N=' + JSON.stringify(stats.nValues));
}

// Write JSON
const output = {
  meta: {
    version: 'v0.4.3',
    experiment: 'EXP-021',
    description: 'Alternative [4,8,2,N] header investigation',
    date: new Date().toISOString(),
    searchRange: SEARCH_RANGE,
    totalFaces,
    totalAlternatives,
    facesWithAlternatives,
    facesWithMultiple,
  },
  nValueDistribution,
  directionCounts,
  nByDirection,
  deltaDistribution,
  perFile: fileResults,
  correlationSample: correlationData.slice(0, 100),
};

fs.writeFileSync(path.join(RESEARCH_DIR, 'v0.4.3', 'EXP021_RESULTS.json'), JSON.stringify(output, null, 2));
console.log('\nResults written to v0.4.3/EXP021_RESULTS.json');

// --- Facts ---
console.log('\n' + '='.repeat(70));
console.log('FACTS');
console.log('='.repeat(70));
console.log('1. Total faces analyzed: ' + totalFaces);
console.log('2. Total alternative [4,8,2,N] headers (non-B2): ' + totalAlternatives);
console.log('3. Faces with alternatives: ' + facesWithAlternatives + ' (' + (facesWithAlternatives / totalFaces * 100).toFixed(1) + '%)');
console.log('4. Faces with multiple alternatives: ' + facesWithMultiple);
console.log('5. N value distribution: ' + JSON.stringify(nValueDistribution));
console.log('6. Direction: BEFORE=' + directionCounts.BEFORE + ', AFTER=' + directionCounts.AFTER);
console.log('7. Delta distribution (top 5): ' + JSON.stringify(sortedDeltas.slice(0, 5)));

// --- Hypotheses ---
console.log('\n' + '='.repeat(70));
console.log('HYPOTHESES (to be tested)');
console.log('='.repeat(70));
console.log('H1: Alternative headers represent a secondary structure in the face data');
console.log('H2: Alternative headers are correlated with face complexity (vc, ec, sections)');
console.log('H3: Alternative headers appear at fixed offsets from the true B1');
console.log('H4: Alternative headers with different N values represent different structure types');

// --- Confidence ---
console.log('\n' + '='.repeat(70));
console.log('CONFIDENCE');
console.log('='.repeat(70));
console.log('High: Alternative headers exist and are non-random');
console.log('Medium: N value distribution is non-uniform');
console.log('Low: Semantic meaning of alternatives');

// --- Unknowns ---
console.log('\n' + '='.repeat(70));
console.log('UNKNOWNS');
console.log('='.repeat(70));
console.log('1. What do alternative [4,8,2,N] headers represent?');
console.log('2. Why do some faces have alternatives and others do not?');
console.log('3. What determines the N value of an alternative?');
console.log('4. What determines the offset (delta) of an alternative?');
console.log('5. Are alternatives related to face topology, geometry, or metadata?');
console.log('6. Do alternatives appear in other SolidWorks versions?');
