#!/usr/bin/env node
/* EXP-065 / NQ-047 — the Z field groups by feature tree, not by topology.
 *
 * EXP-060 read C04 against C06, found them topologically identical with
 * different Z, and concluded the field is not a topology count. EXP-064 then
 * read C04 against C05/C06/C11, found three agreeing and one not, and called
 * C04 an unexplained outlier. Both were looking at too small a piece.
 *
 * C04's hole is Cut-Extrude1. C05's, C06's and C11's are Cut-Extrude2 -- a
 * SolidWorks feature counter only reaches 2 if a Cut-Extrude1 existed and was
 * removed. So those three carry a deleted feature in their history and C04 does
 * not. They are not four builds of one model; they are two provenances. In the
 * 2011 corpus all four are Cut-Extrude1 and all four read 297.
 *
 * Prediction, tested here against the whole corpus at once: Z is constant within
 * each FEATURE-TREE group, and where topology grouping and feature-tree grouping
 * disagree, Z follows the feature tree. Both groupings are scored side by side
 * so the comparison cannot be steered by picking a pair.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const iR = b => zlib.inflateRawSync(Buffer.from(b)), iZ = b => zlib.inflateSync(Buffer.from(b));

const FEAT = /^(Boss-Extrude|Cut-Extrude|Fillet|Chamfer|Shell|Revolve|Loft|Sketch)\d*$/;

function utf16Names(bufs) {
  const out = [];
  for (const b of bufs)
    for (let i = 0; i + 6 < b.length; i++) {
      if (b[i + 1] !== 0 || b[i] < 0x41) continue;
      let j = i, s = '';
      while (j + 1 < b.length && b[j + 1] === 0 && b[j] >= 0x20 && b[j] < 0x7f) { s += String.fromCharCode(b[j]); j += 2; }
      if (FEAT.test(s)) out.push(s);
      i = j;
    }
  return [...new Set(out)].sort();
}
function featureTree(f, legacy) {
  if (legacy) return utf16Names([fs.readFileSync(f)]);
  const s = v1.decompressOpenSX(fs.readFileSync(f), iR, iZ);
  return utf16Names(Object.keys(s).map(k => Buffer.from(s[k])));
}
function zOf(dir) {
  const f = path.join(dir, 'model.x_t');
  if (!fs.existsSync(f)) return null;
  const s = fs.readFileSync(f, 'latin1').replace(/\r?\n/g, '');
  const m = s.match(/Z1\s+(\d+)\s+2\s+3/);
  return m ? parseInt(m[1], 10) : null;
}
/* Topology signature from the parsed body: face count plus sorted surface tags.
 * Independent of any name string, so the two groupings share no input. */
function topoSig(dir) {
  const v2 = require(path.join(ROOT, 'parser/v0.2/src/parser-core.js'));
  const f = path.join(dir, 'model.SLDPRT');
  try {
    const r = v2.parseSLDPRT(fs.readFileSync(f), iR, iZ);
    if (r.errors && r.errors.length) return null;
    return r.faces.length + ':' + r.faces.map(x => (x.metadata && x.metadata.typeTag) || 0).sort().join(',');
  } catch (e) { return null; }
}

function score(label, rows, keyFn) {
  const g = new Map();
  for (const r of rows) {
    const k = keyFn(r); if (k === null) continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  let consistent = 0, total = 0, split = [];
  for (const [k, v] of g) {
    if (v.length < 2) continue;
    total++;
    const zs = new Set(v.map(x => x.z));
    if (zs.size === 1) consistent++;
    else split.push(`${v.map(x => x.d.slice(0, 12)).join('/')} -> Z ${[...zs].join('/')}`);
  }
  console.log(`  ${label.padEnd(22)} ${consistent}/${total} multi-model groups have a single Z`);
  for (const s of split) console.log(`      SPLIT: ${s}`);
  return { consistent, total };
}

for (const era of ['SW2022', 'SW2011']) {
  const B = path.join(ROOT, 'test files new', era);
  const rows = [];
  for (const d of fs.readdirSync(B).sort()) {
    const dir = path.join(B, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    const z = zOf(dir); if (z === null) continue;
    const mf = path.join(dir, 'model.SLDPRT');
    if (!fs.existsSync(mf)) continue;
    rows.push({ d, z, tree: featureTree(mf, era === 'SW2011').join('|'), topo: topoSig(dir) });
  }
  console.log(`\n${'='.repeat(74)}\n${era}  (${rows.length} models)\n${'='.repeat(74)}`);
  score('grouped by topology', rows, r => r.topo);
  score('grouped by feature tree', rows, r => r.tree);
  console.log('\n  the models whose two groupings disagree:');
  for (const r of rows.filter(r => /Cut-Extrude/.test(r.tree) && /cube_hole|two_holes/.test(r.d)))
    console.log(`    ${r.d.padEnd(30)} Z=${String(r.z).padStart(4)}  ${r.tree.split('|').filter(x => /Cut|Boss/.test(x)).join(',')}`);
}
