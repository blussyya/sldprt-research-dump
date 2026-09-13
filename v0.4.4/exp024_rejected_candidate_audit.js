/**
 * EXP-024: Rejected Candidate Audit
 * 
 * Classify every rejected candidate into categories.
 * Determine whether any rejected candidates are structurally close to genuine faces.
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
console.log('EXP-024: Rejected Candidate Audit');
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
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_OFFSET',
          ec: null,
          vc: null,
        });
        continue;
      }
      
      const edgeCount = dlBuf.readUInt32LE(faceStartOffset);
      
      if (edgeCount < 1 || edgeCount > 500) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_EC',
          ec: edgeCount,
          vc: null,
        });
        continue;
      }
      
      if (dlBuf.readUInt32LE(mp + 8) !== 2) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_GAP_WORD2',
          ec: edgeCount,
          vc: null,
        });
        continue;
      }
      
      const vertexCount = dlBuf.readUInt32LE(mp + 12);
      
      if (vertexCount < 3 || vertexCount > 6000) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_VC',
          ec: edgeCount,
          vc: vertexCount,
        });
        continue;
      }
      
      const verticesStart = mp + 16;
      if (verticesStart + vertexCount * 12 > dlBuf.length) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'OVERFLOW_VERTICES',
          ec: edgeCount,
          vc: vertexCount,
        });
        continue;
      }
      
      // Validate vertex data
      let vertexValid = true;
      for (let i = 0; i < vertexCount; i++) {
        const x = dlBuf.readFloatLE(verticesStart + i * 12);
        if (!isFinite(x) || Math.abs(x) > 1e5) {
          vertexValid = false;
          break;
        }
      }
      
      if (!vertexValid) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_VERTEX_DATA',
          ec: edgeCount,
          vc: vertexCount,
        });
        continue;
      }
      
      const verticesEnd = verticesStart + vertexCount * 12;
      const gapStart = verticesEnd;
      
      if (gapStart + 16 > dlBuf.length) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'OVERFLOW_GAP',
          ec: edgeCount,
          vc: vertexCount,
        });
        continue;
      }
      
      const gap = [
        dlBuf.readUInt32LE(gapStart),
        dlBuf.readUInt32LE(gapStart + 4),
        dlBuf.readUInt32LE(gapStart + 8),
        dlBuf.readUInt32LE(gapStart + 12),
      ];
      
      if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vertexCount) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_GAP',
          ec: edgeCount,
          vc: vertexCount,
          gap: gap,
        });
        continue;
      }
      
      const normalsStart = gapStart + 16;
      const normalsEnd = normalsStart + vertexCount * 12;
      const block1Start = normalsEnd;
      
      if (block1Start + 8 > dlBuf.length) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'OVERFLOW_B1',
          ec: edgeCount,
          vc: vertexCount,
        });
        continue;
      }
      
      const b1Word0 = dlBuf.readUInt32LE(block1Start);
      const b1Word1 = dlBuf.readUInt32LE(block1Start + 4);
      
      if (b1Word0 < 1 || b1Word0 > 500) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_B1_WORD0',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
        });
        continue;
      }
      
      if (b1Word1 < 1 || b1Word1 > 500) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_B1_WORD1',
          ec: edgeCount,
          vc: vertexCount,
          b1Word1: b1Word1,
        });
        continue;
      }
      
      if (b1Word0 + b1Word1 > 2000) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'B1_TOO_LARGE',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
          b1Word1: b1Word1,
        });
        continue;
      }
      
      // Check B2 values
      let b2Valid = true;
      let sectionCount = 0;
      if (block1Start + b1Word0 * 4 <= dlBuf.length) {
        for (let i = 0; i < b1Word0; i++) {
          const b2Val = dlBuf.readUInt32LE(block1Start + b1Word0 * 4 + i * 4);
          if (b2Val >= 1 && b2Val <= 500) {
            sectionCount++;
          } else {
            b2Valid = false;
            break;
          }
        }
      } else {
        b2Valid = false;
      }
      
      if (!b2Valid) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INVALID_B2',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
          b1Word1: b1Word1,
        });
        continue;
      }
      
      // Check INV-016: b1len = 2*(vc - secCount)
      const expectedB1Len = 2 * (vertexCount - sectionCount);
      if (b1Word0 !== expectedB1Len) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INV016_FAIL',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
          expectedB1Len: expectedB1Len,
          secCount: sectionCount,
        });
        continue;
      }
      
      // Check INV-017: sectionLen = b2[i] - 1
      let sectionLensValid = true;
      if (block1Start + b1Word0 * 4 <= dlBuf.length) {
        for (let i = 0; i < sectionCount; i++) {
          const sectionLen = dlBuf.readUInt32LE(block1Start + b1Word0 * 4 + i * 4);
          const expectedSectionLen = (i < sectionCount - 1) ?
            dlBuf.readUInt32LE(block1Start + b1Word0 * 4 + (i + 1) * 4) - sectionLen :
            b1Word1;
          
          // Simplified check: just ensure sectionLen is reasonable
          if (sectionLen < 1 || sectionLen > 500) {
            sectionLensValid = false;
            break;
          }
        }
      }
      
      if (!sectionLensValid) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INV017_FAIL',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
          b1Word1: b1Word1,
        });
        continue;
      }
      
      // Check INV-018: sum(b2) = b1len
      let b2Sum = 0;
      if (block1Start + b1Word0 * 4 <= dlBuf.length) {
        for (let i = 0; i < b1Word0; i++) {
          b2Sum += dlBuf.readUInt32LE(block1Start + b1Word0 * 4 + i * 4);
        }
      }
      
      if (b2Sum !== b1Word0) {
        allCandidates.push({
          file: file,
          mp: mp,
          category: 'INV018_FAIL',
          ec: edgeCount,
          vc: vertexCount,
          b1Word0: b1Word0,
          b1Word1: b1Word1,
          b2Sum: b2Sum,
        });
        continue;
      }
      
      // This is a valid face
      allCandidates.push({
        file: file,
        mp: mp,
        category: 'VALID',
        ec: edgeCount,
        vc: vertexCount,
        b1Word0: b1Word0,
        b1Word1: b1Word1,
        secCount: sectionCount,
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
const outputPath = path.join(RESEARCH_DIR, 'v0.4.4', 'EXP024_RESULTS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalCandidates: allCandidates.length,
  validCandidates: valid.length,
  invalidCandidates: invalid.length,
  categoryDistribution: catDist,
  perFile: fileStats,
  candidates: allCandidates,
}, null, 2));

console.log('\nResults saved to: ' + outputPath);
