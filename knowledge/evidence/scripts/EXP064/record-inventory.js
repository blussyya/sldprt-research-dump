// EXP-064 verification B: reconcile the walker-free hits with the parser's
// faces, and settle the record's decoded/undecoded byte inventory.
//
// EXP-061 listed +32, +56, +80 and +88 as undecoded words. EXP-062 says they are
// interior bytes of doubles already decoded. This script checks that by span
// arithmetic rather than by argument, and then reports what actually remains.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const v2 = require(path.join(ROOT, 'parser/v0.2/src/parser-core.js'));
const { scan } = require('./rawscan-bounds.js');
const iR = b => zlib.inflateRawSync(Buffer.from(b)), iZ = b => zlib.inflateSync(Buffer.from(b));

// --- span arithmetic -------------------------------------------------------
const DOUBLES = [12, 20, 28, 36, 44, 52, 60, 68, 76, 84];
const covered = new Set();
for (const o of DOUBLES) for (let i = 0; i < 8; i++) covered.add(o + i);
const span = [Math.min(...covered), Math.max(...covered)];
const gapsInside = [...Array(span[1] - span[0] + 1).keys()]
  .map(i => i + span[0]).filter(b => !covered.has(b));
console.log(`decoded doubles            ${DOUBLES.length} x f64`);
console.log(`byte span they occupy      ${span[0]}..${span[1]} inclusive`);
console.log(`unclaimed bytes inside it  ${gapsInside.length === 0 ? 'none (contiguous)' : gapsInside.join(',')}`);
for (const q of [32, 56, 80, 88])
  console.log(`  EXP-061 called +${String(q).padEnd(3)} undecoded -> ` +
    (covered.has(q) ? `INSIDE the f64 at +${DOUBLES.filter(d => d <= q).pop()}` : 'genuinely free'));
console.log(`remaining undecoded ranges 0..${span[0] - 1} and ${span[1] + 1}..131\n`);

// --- reconcile hits with parser faces --------------------------------------
const BASE = path.join(ROOT, 'test files new/SW2022');
let nFace = 0, matched = 0, missedLow = 0, missedOther = 0;
const missReasons = new Map();
const lead = new Map(), tailNonZero = new Map();
for (const d of fs.readdirSync(BASE).sort()) {
  const dir = path.join(BASE, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  const buf = fs.readFileSync(path.join(dir, 'model.SLDPRT'));
  const dl = Buffer.from(v1.findDisplayLists(buf, iR, iZ));
  const r = v2.parseSLDPRT(buf, iR, iZ);
  if (r.errors && r.errors.length) continue;
  const hitAt = new Set(scan(dl).map(h => h.o));
  for (const f of r.faces) {
    nFace++;
    const o = f.geometryEnd;
    if (hitAt.has(o)) matched++;
    else {
      const R = dl.readDoubleLE(o + 84);
      const why = !Number.isFinite(R) ? 'radius not finite'
        : R < 1e-9 ? `radius below 1e-9 m (${R.toExponential(2)})` : 'identity failed';
      if (/radius below/.test(why)) missedLow++; else missedOther++;
      missReasons.set(why.replace(/\(.*\)/, ''), (missReasons.get(why.replace(/\(.*\)/, '')) || 0) + 1);
    }
    // inventory of the two undecoded ranges
    lead.set([...dl.subarray(o, o + 12)].join(' '), (lead.get([...dl.subarray(o, o + 12)].join(' ')) || 0) + 1);
    const t = dl.subarray(o + 92, o + 132);
    tailNonZero.set(t.some(x => x !== 0) ? 'has nonzero' : 'all zero',
      (tailNonZero.get(t.some(x => x !== 0) ? 'has nonzero' : 'all zero') || 0) + 1);
  }
}
console.log(`SW2022 parser faces                 ${nFace}`);
console.log(`  found by walker-free scan         ${matched}/${nFace}`);
console.log(`  missed, radius below 1e-9 m       ${missedLow}`);
console.log(`  missed, identity actually failed  ${missedOther}`);
for (const [k, v] of missReasons) console.log(`     ${v}  ${k}`);
console.log(`\nundecoded tail +92..+131:`);
for (const [k, v] of tailNonZero) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\nundecoded head +0..+11, distinct values: ${lead.size}`);
[...lead].sort((a, b) => b[1] - a[1]).slice(0, 5)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)} x  [${k}]`));
