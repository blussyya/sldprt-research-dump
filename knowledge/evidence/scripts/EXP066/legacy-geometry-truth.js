#!/usr/bin/env node
/* EXP-066 — does parser/v0.3's LEGACY decode produce correct geometry?
 *
 * v0.3's own suite checks legacy face COUNTS against the build log and that a
 * bounds record is present. CORE_VALIDATION.md says so plainly: "Count
 * agreement and decoder parity alone do not prove exact geometry." This script
 * is that missing gate.
 *
 * Three independent checks, none of which v0.3's suite performs:
 *
 *   1. Tessellation vertices against dimensions known IN ADVANCE from the build
 *      specification. A cube declared as 10 mm at the origin must tessellate
 *      into [0, 0.01] on every axis, in metres. This cannot be satisfied by a
 *      decode that merely parses without throwing.
 *   2. Legacy vertices against the MODERN vertices of the same model. The
 *      corpus is geometry-matched, so the two eras must agree.
 *   3. Vertices against the per-face bounding record (INV-026), which v0.3
 *      decodes separately. The mesh must sit inside its own stored box.
 *
 * Check 3 is the strongest, because the bounds and the vertices are different
 * regions of the stream decoded by different code paths. Agreement between them
 * is not something a wrong offset produces.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v3 = require(path.join(ROOT, 'parser/v0.3/src/parser-core.js'));
const iR = b => new Uint8Array(zlib.inflateRawSync(b));
const iZ = b => new Uint8Array(zlib.inflateSync(b));

/* Declared geometry, in metres, taken from the model names and the build
 * specification -- NOT from anything the parser produced. */
const NOMINAL = {
  C00_cube_10mm: [[0, 0, 0], [0.010, 0.010, 0.010]],
  C01_cube_20mm: [[0, 0, 0], [0.020, 0.020, 0.020]],
  C02_cube_translated: [[0.050, 0.050, 0], [0.060, 0.060, 0.010]],
  C14_sphere: [[-0.005, -0.005, -0.005], [0.005, 0.005, 0.005]],
  C15_torus: [[-0.007, -0.002, -0.007], [0.007, 0.002, 0.007]],
  C19_half_cylinder: [[-0.005, 0, -0.005], [0.005, 0.010, 0]],
  C22_cube_sw2011_native: [[0, 0, 0], [0.010, 0.010, 0.010]]
};

function meshBox(faces) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const f of faces)
    for (let i = 0; i < f.vertices.length; i += 3)
      for (let a = 0; a < 3; a++) {
        mn[a] = Math.min(mn[a], f.vertices[i + a]);
        mx[a] = Math.max(mx[a], f.vertices[i + a]);
      }
  return [mn, mx];
}
const parse = f => v3.parseSLDPRT(fs.readFileSync(f), iR, iZ);

const L = path.join(ROOT, 'test files new/SW2011'), M = path.join(ROOT, 'test files new/SW2022');

// ---- 1. legacy vertices vs dimensions declared in advance -------------------
console.log('1. LEGACY tessellation vs nominal dimensions (metres, tolerance 2e-5 m)');
let nom = 0, nomOK = 0;
for (const [model, [emn, emx]] of Object.entries(NOMINAL)) {
  const f = path.join(L, model, 'model.SLDPRT');
  if (!fs.existsSync(f)) continue;
  const r = parse(f);
  if (r.errors.length) { console.log(`   ${model.padEnd(24)} ERRORS ${r.errors}`); continue; }
  const [mn, mx] = meshBox(r.faces);
  nom++;
  const ok = [0, 1, 2].every(a => Math.abs(mn[a] - emn[a]) < 2e-5 && Math.abs(mx[a] - emx[a]) < 2e-5);
  if (ok) nomOK++;
  console.log(`   ${model.padEnd(24)} ${ok ? 'OK  ' : 'FAIL'} min[${mn.map(x => x.toFixed(6))}] max[${mx.map(x => x.toFixed(6))}]`);
}
console.log(`   => ${nomOK}/${nom} match dimensions known in advance\n`);

// ---- 2. legacy vs modern, geometry-matched models --------------------------
console.log('2. LEGACY vs MODERN mesh box, same model both eras (tolerance 2e-5 m)');
let cmp = 0, agree = 0; const diffs = [];
for (const d of fs.readdirSync(L).sort()) {
  const lf = path.join(L, d, 'model.SLDPRT'), mf = path.join(M, d, 'model.SLDPRT');
  if (!fs.existsSync(lf) || !fs.existsSync(mf)) continue;
  const rl = parse(lf), rm = parse(mf);
  if (rl.errors.length || rm.errors.length || !rl.faces.length || !rm.faces.length) continue;
  const [amn, amx] = meshBox(rl.faces), [bmn, bmx] = meshBox(rm.faces);
  cmp++;
  const worst = Math.max(...[0, 1, 2].map(a => Math.max(Math.abs(amn[a] - bmn[a]), Math.abs(amx[a] - bmx[a]))));
  if (worst < 2e-5) agree++; else diffs.push(`${d}: worst ${worst.toExponential(3)} m`);
  if (rl.faces.length !== rm.faces.length) diffs.push(`${d}: FACE COUNT ${rl.faces.length} vs ${rm.faces.length}`);
}
console.log(`   models comparable                 ${cmp}`);
console.log(`   mesh boxes agree across eras      ${agree}/${cmp}`);
for (const x of diffs) console.log(`     ${x}`);

// ---- 3. vertices inside their own decoded bounding record ------------------
console.log('\n3. Per-face mesh inside its own stored bounds record (INV-026)');
for (const [label, base] of [['SW2011', L], ['SW2022', M]]) {
  let n = 0, inside = 0, noBounds = 0; let worst = 0, worstWho = '';
  for (const d of fs.readdirSync(base).sort()) {
    const f = path.join(base, d, 'model.SLDPRT');
    if (!fs.existsSync(f)) continue;
    const r = parse(f);
    if (r.errors.length) continue;
    for (const fc of r.faces) {
      n++;
      const bd = fc.bounds;
      if (!bd) { noBounds++; continue; }
      const mn = bd.min || bd.minimum, mx = bd.max || bd.maximum;
      if (!mn || !mx) { noBounds++; continue; }
      let bad = 0;
      for (let i = 0; i < fc.vertices.length; i += 3)
        for (let a = 0; a < 3; a++) {
          const v = fc.vertices[i + a];
          bad = Math.max(bad, Math.max(mn[a] - v, v - mx[a]));
        }
      if (bad <= 1e-8) inside++;
      if (bad > worst) { worst = bad; worstWho = `${d} face`; }
    }
  }
  console.log(`   ${label}: faces ${n}, mesh inside stored bounds ${inside}/${n - noBounds}` +
    (noBounds ? `, no bounds decoded ${noBounds}` : '') +
    `, worst excursion ${worst.toExponential(3)} m ${worstWho}`);
}
