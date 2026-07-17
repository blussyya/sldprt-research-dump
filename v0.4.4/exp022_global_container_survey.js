/**
 * EXP-022: Global Container Survey
 * 
 * Scan the entire DisplayLists stream.
 * Locate every [4,8,2,N] pattern.
 * Record absolute offset, preceding/following bytes, N, body length.
 * Classify each occurrence.
 * Cluster by surrounding byte patterns.
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
console.log('EXP-022: Global Container Survey');
console.log('='.repeat(70));

const allContainers = [];

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
    console.log('  DisplayLists size: ' + dlBuf.length + ' bytes');
    
    // Scan for all [4,8,2,N] patterns
    const pattern = [4, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0];
    
    for (let i = 0; i <= dlBuf.length - 16; i++) {
      // Check for [4,8,2,N]
      if (dlBuf.readUInt32LE(i) === 4 &&
          dlBuf.readUInt32LE(i + 4) === 8 &&
          dlBuf.readUInt32LE(i + 8) === 2) {
        
        const n = dlBuf.readUInt32LE(i + 12);
        
        // Record preceding bytes (16 bytes before)
        const precedBytes = [];
        for (let j = -16; j < 0; j += 4) {
          const pos = i + j;
          if (pos >= 0) {
            precedBytes.push(dlBuf.readUInt32LE(pos));
          } else {
            precedBytes.push(null);
          }
        }
        
        // Record following bytes (16 bytes after header)
        const followBytes = [];
        for (let j = 16; j < 32; j += 4) {
          const pos = i + j;
          if (pos + 4 <= dlBuf.length) {
            followBytes.push(dlBuf.readUInt32LE(pos));
          } else {
            followBytes.push(null);
          }
        }
        
        // Calculate body length (distance to next [4,8,2,N] or end)
        let bodyLen = 0;
        for (let j = i + 16; j <= dlBuf.length - 16; j += 4) {
          if (dlBuf.readUInt32LE(j) === 4 &&
              dlBuf.readUInt32LE(j + 4) === 8 &&
              dlBuf.readUInt32LE(j + 8) === 2) {
            bodyLen = j - (i + 16);
            break;
          }
        }
        if (bodyLen === 0) bodyLen = dlBuf.length - (i + 16);
        
        // Classify based on surrounding context
        let classification = 'UNKNOWN';
        
        // Check if it's followed by [12,100,2,vc] (face marker)
        if (followBytes[0] === 12 && followBytes[1] === 100 && followBytes[2] === 2) {
          classification = 'FACE_B1';
        }
        // Check if preceded by face marker
        else if (precedBytes[3] === 12 && precedBytes[2] === 100 && precedBytes[1] === 2) {
          classification = 'FACE_HEADER';
        }
        // Check for other patterns
        else if (n === 1 && bodyLen <= 8) {
          classification = 'SMALL_CONTAINER';
        }
        else if (n === 2 && bodyLen <= 16) {
          classification = 'SMALL_CONTAINER';
        }
        
        allContainers.push({
          file: file,
          offset: i,
          n: n,
          precedBytes: precedBytes,
          followBytes: followBytes,
          bodyLen: bodyLen,
          classification: classification,
        });
      }
    }
    
    console.log('  Found ' + allContainers.filter(c => c.file === file).length + ' [4,8,2,N] patterns');
    
  } catch (e) {
    console.log('  Error: ' + e.message);
  }
}

// Summarize results
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

console.log('\nTotal [4,8,2,N] patterns found: ' + allContainers.length);

// N distribution
const nDist = {};
for (const c of allContainers) {
  nDist[c.n] = (nDist[c.n] || 0) + 1;
}
console.log('\nN distribution:');
for (const [n, count] of Object.entries(nDist).sort((a, b) => a[0] - b[0])) {
  console.log('  N=' + n + ': ' + count + ' (' + (100 * count / allContainers.length).toFixed(1) + '%)');
}

// Classification distribution
const classDist = {};
for (const c of allContainers) {
  classDist[c.classification] = (classDist[c.classification] || 0) + 1;
}
console.log('\nClassification distribution:');
for (const [cls, count] of Object.entries(classDist).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + cls + ': ' + count + ' (' + (100 * count / allContainers.length).toFixed(1) + '%)');
}

// Body length distribution
const bodyLens = allContainers.map(c => c.bodyLen);
console.log('\nBody length statistics:');
console.log('  Min: ' + Math.min(...bodyLens));
console.log('  Max: ' + Math.max(...bodyLens));
console.log('  Avg: ' + (bodyLens.reduce((a, b) => a + b, 0) / bodyLens.length).toFixed(1));

// Per-file summary
console.log('\nPer-file summary:');
const fileStats = {};
for (const c of allContainers) {
  if (!fileStats[c.file]) fileStats[c.file] = { total: 0, classifications: {} };
  fileStats[c.file].total++;
  fileStats[c.file].classifications[c.classification] = (fileStats[c.file].classifications[c.classification] || 0) + 1;
}
for (const [file, stats] of Object.entries(fileStats)) {
  console.log('  ' + file + ': ' + stats.total + ' patterns');
  for (const [cls, count] of Object.entries(stats.classifications)) {
    console.log('    ' + cls + ': ' + count);
  }
}

// Save results
const outputPath = path.join(RESEARCH_DIR, 'v0.4.4', 'EXP022_RESULTS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalContainers: allContainers.length,
  nDistribution: nDist,
  classificationDistribution: classDist,
  bodyLengthStats: {
    min: Math.min(...bodyLens),
    max: Math.max(...bodyLens),
    avg: bodyLens.reduce((a, b) => a + b, 0) / bodyLens.length,
  },
  perFile: fileStats,
  containers: allContainers,
}, null, 2));

console.log('\nResults saved to: ' + outputPath);
