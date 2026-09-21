#!/usr/bin/env node
/* Cross-validate the XT binary header/schema read against the .x_t text form
 * of the same body. The two encodings are produced independently by
 * SolidWorks, so agreement between them is real evidence, not a tautology.
 *
 * Checks, per model:
 *   1. the embedded Contents/Config-0-Partition parses as a transmit header
 *   2. the exported model.x_b parses as a transmit header
 *   3. the schema entries read from model.x_b agree, in order, with the same
 *      entries read from the ASCII model.x_t
 *
 * Exits nonzero on any disagreement.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const XT = require('../src/xt-reader.js');

const iR = b => zlib.inflateRawSync(Buffer.from(b));
const iZ = b => zlib.inflateSync(Buffer.from(b));

function inflatePartition(sldprt) {
  const s = v1.decompressOpenSX(fs.readFileSync(sldprt), iR, iZ);
  const n = Object.keys(s).find(x => /Config-0-Partition$/.test(x));
  if (!n) return null;
  const d = Buffer.from(s[n]);
  for (let i = 0; i < Math.min(d.length - 2, 4096); i++) {
    if (d[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(d[i + 1])) {
      try { return zlib.inflateSync(d.subarray(i)); } catch (e) {}
    }
  }
  return null;
}

function xbBody(file) {
  const b = fs.readFileSync(file);
  const e = b.indexOf(Buffer.from('**END_OF_HEADER'));
  if (e < 0) return b;
  let s = e; while (s < b.length && b[s] !== 0x0a) s++;
  return b.subarray(s + 1);
}

const BASE = path.join(ROOT, 'test files new/SW2022');
const models = fs.readdirSync(BASE, { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name).sort();

let fail = 0, nPart = 0, nXb = 0, nAgree = 0, entriesChecked = 0, lengthDiff = 0;
const trailingSeen = new Set(), textFlagSeen = new Set();
const stops = new Map();
const schemas = new Set();

for (const m of models) {
  const dir = path.join(BASE, m);
  const sldprt = path.join(dir, 'model.SLDPRT');
  const xbF = path.join(dir, 'model.x_b'), xtF = path.join(dir, 'model.x_t');
  if (!fs.existsSync(xbF) || !fs.existsSync(xtF)) { console.log(`${m}: missing Parasolid exports`); fail++; continue; }

  // 1. partition header
  let part = null;
  try { part = inflatePartition(sldprt); } catch (e) {}
  if (!part) { console.log(`${m}: partition did not inflate`); fail++; }
  else {
    try {
      const h = XT.readHeader(part);
      if (!h.isPartition) { console.log(`${m}: partition header lacks "(partition)"`); fail++; }
      else { nPart++; schemas.add(h.schema); }
    } catch (e) { console.log(`${m}: partition header: ${e.message}`); fail++; }
  }

  // 2 + 3. x_b header and schema agreement with x_t
  const xb = xbBody(xbF);
  let r;
  try { r = XT.read(xb); nXb++; } catch (e) { console.log(`${m}: x_b header: ${e.message}`); fail++; continue; }

  // EXP-059: the original form of this check compared only name and code, and
  // looped to Math.min of the two lengths. It therefore could not detect a flag
  // mismatch or a length disagreement, while reporting "tables agreeing" — a
  // narrower check than it sounded like. Compare every field, and report the
  // length relationship separately instead of silently truncating to it.
  //
  // readTextSchemaTable scans the whole transmit, so its tail entries are later
  // declarations separated by node data, not members of the initial table
  // (EXP-059 §1.1). Only the contiguous prefix is comparable here.
  const text = XT.readTextSchemaTable(fs.readFileSync(xtF, 'latin1'));
  const bin = r.schemaEntries;
  const n = Math.min(bin.length, text.length);
  let mismatch = null;
  for (let i = 0; i < n; i++) {
    const b = bin[i], t = text[i];
    if (b.name !== t.name) mismatch = `entry ${i} name: ${b.name} vs ${t.name}`;
    else if (b.code !== t.code) mismatch = `entry ${i} code: ${b.code} vs ${t.code}`;
    if (mismatch) break;
    // The two bytes after `code` are undecoded (EXP-059 §3). Record what they
    // hold rather than asserting an interpretation; a value other than 00 01,
    // or a text flag other than 0, would be the observation that settles it.
    trailingSeen.add(b.trailing.join(' '));
    textFlagSeen.add(t.flag);
  }
  if (mismatch) { console.log(`${m}: SCHEMA MISMATCH ${mismatch}`); fail++; }
  else { nAgree++; entriesChecked += n; }
  if (bin.length !== text.length) lengthDiff++;

  stops.set(r.schemaTableStop || '(ran to end)', (stops.get(r.schemaTableStop || '(ran to end)') || 0) + 1);
}

console.log('\n' + '='.repeat(66));
console.log(`models                                 ${models.length}`);
console.log(`partition headers parsed               ${nPart}/${models.length}`);
console.log(`x_b headers parsed                     ${nXb}/${models.length}`);
console.log(`schema tables agreeing with x_t text   ${nAgree}/${models.length}`);
console.log(`schema entries compared                ${entriesChecked}`);
console.log(`models where the two lengths differ    ${lengthDiff}/${models.length}`);
console.log(`undecoded trailing bytes seen          ${[...trailingSeen].map(x => '[' + x + ']').join(', ')}`);
console.log(`text flag values seen                  ${[...textFlagSeen].join(', ')}`);
if (trailingSeen.size === 1 && textFlagSeen.size === 1)
  console.log('   both constant, so this corpus cannot decide the field split (EXP-059 §3)');
console.log(`distinct schemas seen                  ${[...schemas].join(', ')}`);

// EXP-059 §2: these models share one byte-identical declaration prefix, so the
// per-model counts above are one observation repeated, not independent samples.
// Report that explicitly rather than letting "24/24" imply replication.
const prefixes = new Set();
for (const m of models) {
  const f = path.join(BASE, m, 'model.x_b');
  if (!fs.existsSync(f)) continue;
  const b = xbBody(f);
  try {
    const rr = XT.read(b);
    prefixes.add(require('crypto').createHash('sha1')
      .update(b.subarray(0, rr.schemaTableEnd)).digest('hex'));
  } catch (e) {}
}
console.log(`DISTINCT declaration prefixes          ${prefixes.size}  <- effective sample size`);
if (prefixes.size === 1)
  console.log('   all models share one prefix: agreement above is n=1, not n=' + models.length);
console.log('\nbinary schema-table terminator reasons:');
for (const [k, v] of stops) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log('='.repeat(66));

if (fail) { console.log(`\nFAILURES: ${fail}`); process.exit(1); }
console.log('\nAll checks passed.');
