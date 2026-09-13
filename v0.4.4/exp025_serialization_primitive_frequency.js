/**
 * EXP-025: Serialization Primitive Frequency
 * 
 * Measure how common [4,8,2,N] is across the entire DisplayLists stream.
 * Determine if it's unique to topology or a generic container.
 * Classify all N values globally.
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
console.log('EXP-025: Serialization Primitive Frequency');
console.log('='.repeat(70));

const allPatterns = [];

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
    for (let i = 0; i <= dlBuf.length - 16; i++) {
      if (dlBuf.readUInt32LE(i) === 4 &&
          dlBuf.readUInt32LE(i + 4) === 8 &&
          dlBuf.readUInt32LE(i + 8) === 2) {
        
        const n = dlBuf.readUInt32LE(i + 12);
        
        // Determine context (what's around this pattern)
        let context = 'UNKNOWN';
        
        // Check if followed by face marker [12,100,2,vc]
        if (i + 16 + 4 <= dlBuf.length) {
          const followWord0 = dlBuf.readUInt32LE(i + 16);
          const followWord1 = dlBuf.readUInt32LE(i + 20);
          const followWord2 = dlBuf.readUInt32LE(i + 24);
          
          if (followWord0 === 12 && followWord1 === 100 && followWord2 === 2) {
            context = 'FACE_B1';
          }
          
          // Check for other serialization patterns
          if (i + 16 + 8 <= dlBuf.length) {
            // Check for [4,8,2,N] followed by [4,8,2,M] (nested containers)
            if (followWord0 === 4 && followWord1 === 8 && followWord2 === 2) {
              context = 'NESTED_CONTAINER';
            }
          }
        }
        
        // Check if preceded by face marker
        if (i >= 16) {
          const precedWord0 = dlBuf.readUInt32LE(i - 16);
          const precedWord1 = dlBuf.readUInt32LE(i - 12);
          const precedWord2 = dlBuf.readUInt32LE(i - 8);
          
          if (precedWord0 === 12 && precedWord1 === 100 && precedWord2 === 2) {
            context = 'FACE_HEADER';
          }
        }
        
        allPatterns.push({
          file: file,
          offset: i,
          n: n,
          context: context,
        });
      }
    }
    
    console.log('  Found ' + allPatterns.filter(p => p.file === file).length + ' [4,8,2,N] patterns');
    
  } catch (e) {
    console.log('  Error: ' + e.message);
  }
}

// Summarize results
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

console.log('\nTotal [4,8,2,N] patterns found: ' + allPatterns.length);

// N distribution
const nDist = {};
for (const p of allPatterns) {
  nDist[p.n] = (nDist[p.n] || 0) + 1;
}
console.log('\nN distribution (global):');
for (const [n, count] of Object.entries(nDist).sort((a, b) => a[0] - b[0])) {
  console.log('  N=' + n + ': ' + count + ' (' + (100 * count / allPatterns.length).toFixed(1) + '%)');
}

// Context distribution
const contextDist = {};
for (const p of allPatterns) {
  contextDist[p.context] = (contextDist[p.context] || 0) + 1;
}
console.log('\nContext distribution:');
for (const [ctx, count] of Object.entries(contextDist).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + ctx + ': ' + count + ' (' + (100 * count / allPatterns.length).toFixed(1) + '%)');
}

// Per-file summary
console.log('\nPer-file summary:');
const fileStats = {};
for (const p of allPatterns) {
  if (!fileStats[p.file]) fileStats[p.file] = { total: 0, contexts: {}, nValues: {} };
  fileStats[p.file].total++;
  fileStats[p.file].contexts[p.context] = (fileStats[p.file].contexts[p.context] || 0) + 1;
  fileStats[p.file].nValues[p.n] = (fileStats[p.file].nValues[p.n] || 0) + 1;
}
for (const [file, stats] of Object.entries(fileStats)) {
  console.log('  ' + file + ': ' + stats.total + ' patterns');
  console.log('    Contexts: ' + JSON.stringify(stats.contexts));
  console.log('    N values: ' + JSON.stringify(stats.nValues));
}

// Density analysis
console.log('\nDensity analysis:');
for (const [file, stats] of Object.entries(fileStats)) {
  const filePath = path.join(TEST_DIR, file);
  try {
    const raw = fs.readFileSync(filePath);
    const dl = findDisplayLists(raw);
    if (dl) {
      const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);
      const density = stats.total / dlBuf.length * 1000; // patterns per 1000 bytes
      console.log('  ' + file + ': ' + density.toFixed(2) + ' patterns per 1000 bytes');
    }
  } catch (e) { }
}

// Save results
const outputPath = path.join(RESEARCH_DIR, 'v0.4.4', 'EXP025_RESULTS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalPatterns: allPatterns.length,
  nDistribution: nDist,
  contextDistribution: contextDist,
  perFile: fileStats,
  patterns: allPatterns,
}, null, 2));

console.log('\nResults saved to: ' + outputPath);
