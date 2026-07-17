/**
 * EXP-023: Alternative Header Characterization
 * 
 * Investigate every alternative header discovered in EXP-021.
 * Determine why only some faces have them, why N=1 vs N=2,
 * and whether occurrence correlates with face properties.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESEARCH_DIR = 'C:/Users/basha/Desktop/soldiworks research';
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

// Decompression utilities
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
console.log('EXP-023: Alternative Header Characterization');
console.log('='.repeat(70));

const allFaces = [];

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
      if (faceStartOffset < 0) continue;
      
      const edgeCount = dlBuf.readUInt32LE(faceStartOffset);
      if (edgeCount < 1 || edgeCount > 500) continue;
      
      if (dlBuf.readUInt32LE(mp + 8) !== 2) continue;
      const vertexCount = dlBuf.readUInt32LE(mp + 12);
      if (vertexCount < 3 || vertexCount > 6000) continue;
      
      const verticesStart = mp + 16;
      if (verticesStart + vertexCount * 12 > dlBuf.length) continue;
      
      // Validate vertex data
      let ok = true;
      for (let i = 0; i < vertexCount; i++) {
        const x = dlBuf.readFloatLE(verticesStart + i * 12);
        if (!isFinite(x) || Math.abs(x) > 1e5) { ok = false; break; }
      }
      if (!ok) continue;
      
      const verticesEnd = verticesStart + vertexCount * 12;
      const gapStart = verticesEnd;
      
      if (gapStart + 16 > dlBuf.length) continue;
      
      const gap = [
        dlBuf.readUInt32LE(gapStart),
        dlBuf.readUInt32LE(gapStart + 4),
        dlBuf.readUInt32LE(gapStart + 8),
        dlBuf.readUInt32LE(gapStart + 12),
      ];
      
      if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vertexCount) continue;
      
      const normalsStart = gapStart + 16;
      const normalsEnd = normalsStart + vertexCount * 12;
      const block1Start = normalsEnd;
      
      if (block1Start + 8 > dlBuf.length) continue;
      
      const b1Word0 = dlBuf.readUInt32LE(block1Start);
      const b1Word1 = dlBuf.readUInt32LE(block1Start + 4);
      
      if (b1Word0 < 1 || b1Word0 > 500) continue;
      if (b1Word1 < 1 || b1Word1 > 500) continue;
      if (b1Word0 + b1Word1 > 2000) continue;
      
      // Check for alternative header
      let altFound = false;
      let altN = 0;
      let altOffset = 0;
      
      // Check N=1 at mp-20
      if (mp >= 20) {
        const alt1Pos = mp - 20;
        if (dlBuf.readUInt32LE(alt1Pos) === 4 &&
            dlBuf.readUInt32LE(alt1Pos + 4) === 8 &&
            dlBuf.readUInt32LE(alt1Pos + 8) === 2 &&
            dlBuf.readUInt32LE(alt1Pos + 12) === 1) {
          altFound = true;
          altN = 1;
          altOffset = alt1Pos;
        }
      }
      
      // Check N=2 at mp-24
      if (!altFound && mp >= 24) {
        const alt2Pos = mp - 24;
        if (dlBuf.readUInt32LE(alt2Pos) === 4 &&
            dlBuf.readUInt32LE(alt2Pos + 4) === 8 &&
            dlBuf.readUInt32LE(alt2Pos + 8) === 2 &&
            dlBuf.readUInt32LE(alt2Pos + 12) === 2) {
          altFound = true;
          altN = 2;
          altOffset = alt2Pos;
        }
      }
      
      // Calculate section count
      let sectionCount = 0;
      if (block1Start + b1Word0 * 4 <= dlBuf.length) {
        for (let i = 0; i < b1Word0; i++) {
          const b2Val = dlBuf.readUInt32LE(block1Start + b1Word0 * 4 + i * 4);
          if (b2Val >= 1 && b2Val <= 500) {
            sectionCount++;
          } else {
            sectionCount = 0;
            break;
          }
        }
      }
      
      allFaces.push({
        file: file,
        mp: mp,
        ec: edgeCount,
        vc: vertexCount,
        secCount: sectionCount,
        b1Len: b1Word0,
        hasAlt: altFound,
        altN: altN,
        altOffset: altOffset,
        delta: altFound ? mp - altOffset : null,
      });
    }
    
    console.log('  Extracted ' + allFaces.filter(f => f.file === file).length + ' faces');
    
  } catch (e) {
    console.log('  Error: ' + e.message);
  }
}

// Analyze correlations
console.log('\n' + '='.repeat(70));
console.log('ANALYSIS');
console.log('='.repeat(70));

const withAlt = allFaces.filter(f => f.hasAlt);
const withoutAlt = allFaces.filter(f => !f.hasAlt);

console.log('\nFaces with alternative: ' + withAlt.length + ' (' + (100 * withAlt.length / allFaces.length).toFixed(1) + '%)');
console.log('Faces without alternative: ' + withoutAlt.length + ' (' + (100 * withoutAlt.length / allFaces.length).toFixed(1) + '%)');

// Correlation with edgeCount
console.log('\nCorrelation with edgeCount:');
const ecWithAlt = {};
const ecWithoutAlt = {};
for (const f of withAlt) {
  ecWithAlt[f.ec] = (ecWithAlt[f.ec] || 0) + 1;
}
for (const f of withoutAlt) {
  ecWithoutAlt[f.ec] = (ecWithoutAlt[f.ec] || 0) + 1;
}
console.log('  EC | With Alt | Without Alt');
for (let ec = 1; ec <= 20; ec++) {
  if (ecWithAlt[ec] || ecWithoutAlt[ec]) {
    console.log('  ' + String(ec).padStart(2) + ' | ' + String(ecWithAlt[ec] || 0).padStart(8) + ' | ' + String(ecWithoutAlt[ec] || 0).padStart(10));
  }
}

// Correlation with vertexCount
console.log('\nCorrelation with vertexCount:');
const vcWithAlt = {};
const vcWithoutAlt = {};
for (const f of withAlt) {
  vcWithAlt[f.vc] = (vcWithAlt[f.vc] || 0) + 1;
}
for (const f of withoutAlt) {
  vcWithoutAlt[f.vc] = (vcWithoutAlt[f.vc] || 0) + 1;
}
console.log('  VC | With Alt | Without Alt');
for (let vc = 3; vc <= 20; vc++) {
  if (vcWithAlt[vc] || vcWithoutAlt[vc]) {
    console.log('  ' + String(vc).padStart(2) + ' | ' + String(vcWithAlt[vc] || 0).padStart(8) + ' | ' + String(vcWithoutAlt[vc] || 0).padStart(10));
  }
}

// Correlation with section count
console.log('\nCorrelation with section count:');
const secWithAlt = {};
const secWithoutAlt = {};
for (const f of withAlt) {
  secWithAlt[f.secCount] = (secWithAlt[f.secCount] || 0) + 1;
}
for (const f of withoutAlt) {
  secWithoutAlt[f.secCount] = (secWithoutAlt[f.secCount] || 0) + 1;
}
console.log('  Sec | With Alt | Without Alt');
for (let sec = 1; sec <= 10; sec++) {
  if (secWithAlt[sec] || secWithoutAlt[sec]) {
    console.log('  ' + String(sec).padStart(3) + ' | ' + String(secWithAlt[sec] || 0).padStart(8) + ' | ' + String(secWithoutAlt[sec] || 0).padStart(10));
  }
}

// N value distribution
console.log('\nN value distribution:');
const nDist = {};
for (const f of withAlt) {
  nDist[f.altN] = (nDist[f.altN] || 0) + 1;
}
for (const [n, count] of Object.entries(nDist).sort((a, b) => a[0] - b[0])) {
  console.log('  N=' + n + ': ' + count + ' (' + (100 * count / withAlt.length).toFixed(1) + '%)');
}

// Per-file summary
console.log('\nPer-file summary:');
const fileStats = {};
for (const f of allFaces) {
  if (!fileStats[f.file]) fileStats[f.file] = { total: 0, withAlt: 0, n1: 0, n2: 0 };
  fileStats[f.file].total++;
  if (f.hasAlt) {
    fileStats[f.file].withAlt++;
    if (f.altN === 1) fileStats[f.file].n1++;
    if (f.altN === 2) fileStats[f.file].n2++;
  }
}
for (const [file, stats] of Object.entries(fileStats)) {
  console.log('  ' + file + ': ' + stats.total + ' faces, ' + stats.withAlt + ' with alt (' + (100 * stats.withAlt / stats.total).toFixed(1) + '%), N=1:' + stats.n1 + ', N=2:' + stats.n2);
}

// Save results
const outputPath = path.join(RESEARCH_DIR, 'v0.4.4', 'EXP023_RESULTS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalFaces: allFaces.length,
  withAlternative: withAlt.length,
  withoutAlternative: withoutAlt.length,
  nDistribution: nDist,
  perFile: fileStats,
  faces: allFaces,
}, null, 2));

console.log('\nResults saved to: ' + outputPath);
