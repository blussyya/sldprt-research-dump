#!/usr/bin/env node
// NQ-030: identify the DisplayLists per-face surface tag.
//
// We read a numeric tag per face. 4001=plane and 4002=cylinder are validated;
// 4003=cone is asserted but was never confirmed against a controlled model;
// 4005/4006/4007/4009 are unidentified.
//
// The new corpus ships a BUILD_LOG in which SolidWorks itself states the
// surface type of every face. Join our tag counts against that, per model.
// Where a model has exactly one curved surface type, the mapping is forced.

const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = '/home/user/sldprt-research-dump';
const v2 = require(path.join(ROOT, 'parser/v0.2/src/parser-core.js'));
const iR = b => zlib.inflateRawSync(Buffer.from(b));
const iZ = b => zlib.inflateSync(Buffer.from(b));

// ---- ground truth: parse BUILD_LOG.md into { "C13_cone": ["cone","plane"] }
function readLog(file, prefix) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = {};
  let cur = null, inList = false;
  for (const line of txt.split(/\r?\n/)) {
    const h = line.match(/^##\s+\S*?\/?([A-Z]\d\d_[A-Za-z0-9_]+)\s*$/);
    if (h) { cur = h[1]; out[cur] = []; inList = false; continue; }
    if (!cur) continue;
    if (/Individual face surface types/i.test(line)) { inList = true; continue; }
    if (inList) {
      const m = line.match(/^\s*\d+\.\s*(.+?)\s*$/);
      if (m) out[cur].push(m[1]);
      else if (line.trim() && !/^\s*$/.test(line)) inList = false;
    }
  }
  return out;
}

const dirs = process.argv[2] || path.join(ROOT, 'test files new/SW2022');
const logFile = fs.existsSync(path.join(dirs, 'BUILD_LOG.md'))
  ? path.join(dirs, 'BUILD_LOG.md') : path.join(dirs, 'BUILD_LOG_2011.md');
const truth = readLog(logFile);

// ---- our parse
const models = fs.readdirSync(dirs, { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name).sort();

const pairs = [];   // one row per model
const forced = new Map(); // tag -> Set(surface type) where the mapping is unambiguous

for (const m of models) {
  const f = path.join(dirs, m, 'model.SLDPRT');
  if (!fs.existsSync(f)) { console.log(`${m}: no model.SLDPRT`); continue; }
  const res = v2.parseSLDPRT(fs.readFileSync(f), iR, iZ);
  if (res.errors && res.errors.length) { pairs.push({ m, err: res.errors.join('; ') }); continue; }

  const tags = {};
  for (const face of res.faces) {
    const t = face.metadata && face.metadata.typeTag;
    tags[t] = (tags[t] || 0) + 1;
  }
  const sw = {};
  for (const s of (truth[m] || [])) sw[s] = (sw[s] || 0) + 1;

  pairs.push({ m, tags, sw, nFaces: res.faces.length, nSW: (truth[m] || []).length });

  // Forced mapping: a surface type and a tag that both occur exactly once in
  // this model, with all other types/tags already known, is unambiguous.
  const tk = Object.keys(tags), sk = Object.keys(sw);
  if (tk.length === 1 && sk.length === 1) {
    if (!forced.has(tk[0])) forced.set(tk[0], new Set());
    forced.get(tk[0]).add(sk[0]);
  }
}

const KNOWN = { '4001': 'plane', '4002': 'cylinder' };

console.log('model                      our faces / SW faces   tag counts                    SolidWorks face types');
console.log('-'.repeat(120));
for (const p of pairs) {
  if (p.err) { console.log(`${p.m.padEnd(26)} PARSE ERROR: ${p.err}`); continue; }
  const tg = Object.entries(p.tags).map(([k, v]) => `${k}×${v}`).join(' ');
  const sv = Object.entries(p.sw).map(([k, v]) => `${k}×${v}`).join(' ');
  const flag = p.nFaces === p.nSW ? ' ' : '!';
  console.log(`${p.m.padEnd(26)} ${String(p.nFaces).padStart(3)} /${String(p.nSW).padStart(3)} ${flag}            ${tg.padEnd(28)}  ${sv}`);
}

// ---- solve by elimination
console.log('\n=== mapping by elimination ===');
const solved = { ...KNOWN };
let changed = true, rounds = 0;
while (changed && rounds++ < 10) {
  changed = false;
  for (const p of pairs) {
    if (p.err) continue;
    const unkTags = Object.entries(p.tags).filter(([t]) => !solved[t]);
    const unkTypes = Object.entries(p.sw).filter(([s]) => !Object.values(solved).includes(s));
    if (unkTags.length === 1 && unkTypes.length === 1 && unkTags[0][1] === unkTypes[0][1]) {
      solved[unkTags[0][0]] = unkTypes[0][0];
      console.log(`  ${unkTags[0][0]} = ${unkTypes[0][0].padEnd(22)} (forced by ${p.m}: ${unkTags[0][1]} face(s))`);
      changed = true;
    }
  }
}

console.log('\n=== resolved tag table ===');
for (const [t, s] of Object.entries(solved).sort())
  console.log(`  ${t}  ${s}${KNOWN[t] ? '   (already known)' : '   <-- NEW'}`);

// ---- consistency check across every model
console.log('\n=== consistency check (all models, all faces) ===');
let ok = 0, bad = 0, unknown = 0;
for (const p of pairs) {
  if (p.err) continue;
  const pred = {};
  for (const [t, c] of Object.entries(p.tags)) {
    if (!solved[t]) { unknown += c; continue; }
    pred[solved[t]] = (pred[solved[t]] || 0) + c;
  }
  for (const [s, c] of Object.entries(p.sw)) {
    if ((pred[s] || 0) === c) ok += c;
    else { bad += c; console.log(`  MISMATCH ${p.m}: SolidWorks says ${c}×${s}, our tags predict ${pred[s] || 0}`); }
  }
}
console.log(`  faces agreeing ${ok}, disagreeing ${bad}, carrying an unmapped tag ${unknown}`);
