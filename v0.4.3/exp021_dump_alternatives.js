#!/usr/bin/env node
/**
 * EXP-021: Dump bytes at alternative positions
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

// Load BOTTOM file
const filePath = path.join(RESEARCH_DIR, 'test files original', 'usb hub case (ultimate test)', 'USB hub case BOTTOM.SLDPRT');
const raw = fs.readFileSync(filePath);
const dl = findDisplayLists(raw);
const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);

const matches = findAll(dlBuf, FACE_MARKER);

console.log('='.repeat(70));
console.log('Dumping bytes at alternative positions for BOTTOM');
console.log('='.repeat(70));

// Check first 5 faces with alternatives
let count = 0;
for (const mp of matches) {
  if (count >= 5) break;

  const faceStartOffset = mp - 4;
  if (faceStartOffset < 0) continue;

  const edgeCount = dlBuf.readUInt32LE(faceStartOffset);
  if (edgeCount < 1 || edgeCount > 500) continue;
  if (dlBuf.readUInt32LE(mp + 8) !== 2) continue;
  const vertexCount = dlBuf.readUInt32LE(mp + 12);
  if (vertexCount < 3 || vertexCount > 6000) continue;

  const verticesStart = mp + 16;
  if (verticesStart + vertexCount * 12 > dlBuf.length) continue;

  // Validate vertices
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

  // Check for alternative at mp-20
  const altPos = mp - 20;
  if (altPos >= 0 && altPos + 16 <= dlBuf.length) {
    const altHeader = [
      dlBuf.readUInt32LE(altPos),
      dlBuf.readUInt32LE(altPos + 4),
      dlBuf.readUInt32LE(altPos + 8),
      dlBuf.readUInt32LE(altPos + 12),
    ];

    if (altHeader[0] === 4 && altHeader[1] === 8 && altHeader[2] === 2) {
      console.log('\nFace at 0x' + mp.toString(16) + ': vc=' + vertexCount + ', ec=' + edgeCount);
      console.log('  True B1 at 0x' + block1Start.toString(16));
      console.log('  Alternative at 0x' + altPos.toString(16) + ' (mp-20)');
      console.log('  Alt header: ' + JSON.stringify(altHeader));

      // Dump bytes around the alternative
      console.log('  Bytes at alt-32 to alt+32:');
      for (let i = -32; i <= 32; i += 4) {
        const pos = altPos + i;
        if (pos >= 0 && pos + 4 <= dlBuf.length) {
          const val = dlBuf.readUInt32LE(pos);
          const marker = i === 0 ? ' <-- ALT' : '';
          console.log('    [' + (i >= 0 ? '+' : '') + i + '] 0x' + pos.toString(16) + ': ' + val + ' (0x' + val.toString(16) + ')' + marker);
        }
      }

      count++;
    }
  }
}
