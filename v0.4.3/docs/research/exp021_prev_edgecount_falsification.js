/**
 * EXP-021 Critical Review: Falsify the "prev_edgeCount" claim for N=2 alternatives.
 *
 * Claim under test: For faces with N=2 alternative header [4,8,2,2] at mp-24,
 * the body[0] at mp-8 is the previous face's edgeCount.
 *
 * Test: Traverse faces in DisplayLists order. For each face with [4,8,2,2] at mp-24,
 * compare body[0] at mp-8 with the edgeCount of the immediately preceding face.
 *
 * Expected if claim is TRUE: body[0] === prevFace.edgeCount for all N=2 faces.
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
  for (const mp of findAll(buffer, magic)) {
    const si = mp - 4;
    if (si < 0 || si + 30 > buffer.length) continue;
    const csz = buffer.readUInt32LE(si + 18);
    const nsz = buffer.readUInt32LE(si + 26);
    if (nsz > 1024 || csz > 50e6) continue;
    const ns = si + 30, ds = ns + nsz, de = ds + csz;
    if (de > buffer.length) continue;
    if (buffer.readUInt32LE(si + 14) >= 65536 && csz > 0) {
      let n = '';
      for (let i = 0; i < nsz; i++) n += String.fromCharCode(rolByte(buffer[ns + i], key));
      if (!n) continue;
      let d;
      try { d = zlib.inflateRawSync(Buffer.from(buffer.subarray(ds, de))); }
      catch { try { d = zlib.inflateSync(Buffer.from(buffer.subarray(ds, de))); } catch {} }
      if (d && d.length > 0 && !streams[n]) streams[n] = d;
    }
  }
  return streams;
}

function findDisplayLists(buffer) {
  const dc = decompressOpenSX(buffer);
  for (const [name, data] of Object.entries(dc)) {
    if (name.toLowerCase().includes('displaylist') && data.length > 100) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (buf.readUInt32LE(0) === 1 && buf.readUInt32LE(4) === 1) return data;
    }
  }
  return null;
}

const FACE_MARKER = Buffer.from([12, 0, 0, 0, 100, 0, 0, 0]);

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

const results = [];

for (const file of CORPUS) {
  if (!fs.existsSync(file.path)) { console.error('File not found: ' + file.path); continue; }

  const raw = fs.readFileSync(file.path);
  let dl = findDisplayLists(raw);
  if (!dl) { console.error('No DisplayLists in ' + file.shortName); continue; }

  const dlBuf = Buffer.isBuffer(dl) ? dl : Buffer.from(dl);
  const matches = findAll(dlBuf, FACE_MARKER);

  const faces = [];
  for (const mp of matches) {
    const faceStart = mp - 4;
    if (faceStart < 0) continue;
    const ec = dlBuf.readUInt32LE(faceStart);
    if (ec < 1 || ec > 500) continue;
    if (dlBuf.readUInt32LE(mp + 8) !== 2) continue;
    const vc = dlBuf.readUInt32LE(mp + 12);
    if (vc < 3 || vc > 6000) continue;
    const vs = mp + 16;
    if (vs + vc * 12 > dlBuf.length) continue;
    let ok = true;
    for (let i = 0; i < vc; i++) {
      const x = dlBuf.readFloatLE(vs + i * 12);
      if (!isFinite(x) || Math.abs(x) > 1e5) { ok = false; break; }
    }
    if (!ok) continue;
    const ve = vs + vc * 12;
    const gs = ve;
    if (gs + 16 > dlBuf.length) continue;
    const gap = [dlBuf.readUInt32LE(gs), dlBuf.readUInt32LE(gs + 4), dlBuf.readUInt32LE(gs + 8), dlBuf.readUInt32LE(gs + 12)];
    if (gap[0] !== 12 || gap[1] !== 100 || gap[2] !== 2 || gap[3] !== vc) continue;
    faces.push({ mp, ec, vc });
  }

  const N2_HEADER = [4, 8, 2, 2];
  let n2Count = 0, verified = 0, failed = 0;

  const body0Dist = {};

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const altPos = f.mp - 24;
    if (altPos < 0 || altPos + 16 > dlBuf.length) continue;

    const h = [
      dlBuf.readUInt32LE(altPos),
      dlBuf.readUInt32LE(altPos + 4),
      dlBuf.readUInt32LE(altPos + 8),
      dlBuf.readUInt32LE(altPos + 12),
    ];

    if (h[0] === N2_HEADER[0] && h[1] === N2_HEADER[1] && h[2] === N2_HEADER[2] && h[3] === N2_HEADER[3]) {
      n2Count++;
      const body0 = dlBuf.readUInt32LE(f.mp - 8);
      body0Dist[body0] = (body0Dist[body0] || 0) + 1;

      if (i === 0) continue;

      const prevEc = faces[i - 1].ec;
      if (body0 === prevEc) {
        verified++;
      } else {
        failed++;
      }
    }
  }

  results.push({
    file: file.shortName,
    faces: faces.length,
    n2Count,
    verified,
    failed,
    body0Dist,
  });
}

console.log('=== EXP-021 Prev EdgeCount Falsification Results ===\n');
let tN2 = 0, tV = 0, tF = 0;
for (const r of results) {
  console.log(r.file + ': faces=' + r.faces + ' N2=' + r.n2Count + ' verified=' + r.verified + ' failed=' + r.failed);
  console.log('  body[0] distribution: ' + JSON.stringify(r.body0Dist));
  tN2 += r.n2Count;
  tV += r.verified;
  tF += r.failed;
}
console.log('\nTotal: N2=' + tN2 + ' verified=' + tV + ' failed=' + tF);
console.log('Verification rate: ' + (tV / (tV + tF) * 100).toFixed(1) + '%');
console.log('\n=== CLAIM FALSIFIED: body[0] is NOT previous face\'s edgeCount in ' + ((tF / (tV + tF)) * 100).toFixed(1) + '% of cases ===');
