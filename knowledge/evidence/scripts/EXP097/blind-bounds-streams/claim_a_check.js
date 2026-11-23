#!/usr/bin/env node
// Claim A, blind re-derivation. Bounding records (132 bytes after Block3) of modern DisplayLists faces.
// Offsets of each record come from the package display parser (geometryEnd). Every byte and float is
// read here from the DisplayLists buffer at the offsets the claim names.
// The cylinder axis is the native Parasolid CYLINDER axis (values.axis, unit-normalised), read through the
// package's partition/xt parser and matched to each display face by its Parasolid FACE node_id.
// Usage: node claim_a_check.js            -> claim_a_results.json
//        node claim_a_check.js --controls -> claim_a_controls.json
'use strict';
const fs = require('fs'), path = require('path');
const PKG = '/home/user/dump-validation/package/src';
const display = require(PKG + '/display'), modern = require(PKG + '/container/modern');
const partition = require(PKG + '/parasolid/partition'), zlib = require('zlib');
const HERE = __dirname, ROOT = '/home/user/dump-validation';
const TOL = 2.83e-8, NLO = 0.999999959, NHI = 1.000000040, MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => { const n = norm(a); return n > 0 ? a.map(x => x / n) : [NaN, NaN, NaN]; };
const absCos = (a, b) => Math.abs(dot(a, b)) / (norm(a) * norm(b));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const share = (arr, pred) => arr.filter(pred).length;
const median = arr => { const s = arr.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
const CONTROLS = process.argv.includes('--controls');

function corpusFiles() {
  const out = [];
  for (const d of ['test files original', 'test files new', 'test files online'])
    (function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else if (/\.sldprt$/i.test(f.name)) out.push(q); } })(path.join(ROOT, d));
  return out.sort();
}

// Native Parasolid faces by FACE node_id: surface name and the surface's own vectors.
function nativeFaces(buf) {
  let parsed;
  try { parsed = partition.readBody(buf).parsed; } catch (e) { return { error: e.message, faces: new Map() }; }
  if (parsed.error) return { error: parsed.error, faces: new Map() };
  const byIndex = new Map(parsed.nodes.map(n => [n.index, n]));
  const faces = new Map();
  for (const n of parsed.nodes) {
    if (n.type !== 14) continue;
    const s = byIndex.get(n.values.surface);
    if (!s) continue;
    const v = s.values, info = { surface: s.name };
    if (v.axis) info.axis = unit(v.axis);
    if (v.x_axis) info.x = unit(v.x_axis);
    if (v.normal) info.normal = unit(v.normal);
    if (v.pvec) info.pvec = v.pvec;
    if (v.centre) info.centre = v.centre;
    faces.set(n.values.node_id, info);
  }
  return { error: null, faces };
}

const records = [];
const fileStats = { modernFiles: 0, filesWithRecords: 0, nativeErrors: [] };
for (const p of corpusFiles()) {
  const buf = fs.readFileSync(p);
  if (buf.length < 8 || buf.subarray(4, 8).toString('hex') !== '00000004') continue;
  fileStats.modernFiles++;
  const dl = modern.findDisplayLists(new Uint8Array(buf), inflateRaw, inflateZlib);
  if (!dl) continue;
  const res = display.extractDisplayLists(dl, false);
  const dlBuf = Buffer.from(dl.buffer, dl.byteOffset, dl.byteLength);
  const nat = nativeFaces(buf);
  if (nat.error) fileStats.nativeErrors.push({ file: path.relative(ROOT, p), error: nat.error });
  let any = false;
  for (const f of res.faces) {
    if (!f.bounds || !f.metadata) continue;
    any = true;
    const rb = dlBuf.subarray(f.geometryEnd, f.geometryEnd + 132);
    const u = o => rb.readUInt32LE(o), fl = o => rb.readFloatLE(o);
    const bounds = { min: f.bounds.min, max: f.bounds.max, center: f.bounds.center };
    records.push({
      file: path.relative(ROOT, p), faceId: f.metadata.rawId, displayTag: f.metadata.typeTag,
      head: [u(0), u(4), u(8)], binary: [u(92), u(96), u(104), u(108), u(128)],
      gate: u(104) === 1 && u(108) === 1,
      floats112: [fl(112), fl(116), fl(120), fl(124)],
      vec: [fl(116), fl(120), fl(124)],
      displayDirection: f.metadata.direction,
      bounds, native: nat.faces.get(f.metadata.rawId) || null,
      nativeFileError: nat.error,
    });
  }
  if (any) fileStats.filesWithRecords++;
}
for (const r of records) r.norm = norm(r.vec), r.normInRange = r.norm >= NLO && r.norm <= NHI;

const gated = records.filter(r => r.gate);
const isCyl = r => r.native && r.native.surface === 'CYLINDER';
const gatedCyl = gated.filter(isCyl);
const dispCylGated = gated.filter(r => r.displayTag === 4002);

function summarise() {
  const dots = gatedCyl.map(r => absCos(r.vec, r.native.axis));
  const combos = {};
  for (const r of records) { const k = r.binary.join(','); combos[k] = (combos[k] || 0) + 1; }
  const gateCount = { n: records.length };
  const dispCylNative = {};
  for (const r of dispCylGated) { const k = r.native ? r.native.surface : 'no native face (id not in any parsable section)'; dispCylNative[k] = (dispCylNative[k] || 0) + 1; }
  const noNativeBody = share(dispCylGated, r => !r.native && r.nativeFileError);
  return {
    recordsOwnedByDisplayParserWithMetadata: records.length, files: fileStats.filesWithRecords, modernFilesScanned: fileStats.modernFiles,
    headIs_0_0_1: share(records, r => r.head[0] === 0 && r.head[1] === 0 && r.head[2] === 1),
    binaryWordCombinations_at_92_96_104_108_128: Object.keys(combos).length,
    gatedRecords_104_and_108_are_1: gated.length,
    gatedNormInRange_0_999999959_to_1_000000040: share(gated, r => r.normInRange),
    gatedNormMin: Math.min(...gated.map(r => r.norm)), gatedNormMax: Math.max(...gated.map(r => r.norm)),
    gatedDisplayTag4002_cylinders_claimed_2406: dispCylGated.length,
    gatedDisplayTag4002_by_native_surface: dispCylNative,
    gatedDisplayTag4002_with_no_native_body_parse: noNativeBody,
    nativeCylinderChecked: gatedCyl.length,
    nativeCylinderMaxAbsCos: Math.max(...dots),
    nativeCylinderWithinTol_2_83e_8: share(dots, d => d <= TOL),
    nativeErrorFiles: fileStats.nativeErrors.length,
    nativeErrorSample: fileStats.nativeErrors.slice(0, 5),
  };
}

function controls() {
  const out = {};
  // K1: gate specificity. Ungated records: unit norm, and perpendicularity on native cylinders.
  const ng = records.filter(r => !r.gate), ngCyl = ng.filter(isCyl);
  out.K1_ungated = {
    records: ng.length, unitNormInRange: share(ng, r => r.normInRange), zeroLength: share(ng, r => r.norm === 0),
    nativeCylinders: ngCyl.length, nativeCylindersWithinTol: share(ngCyl, r => absCos(r.vec, r.native.axis) <= TOL),
    nativeCylinderMedianAbsCos: median(ngCyl.map(r => absCos(r.vec, r.native.axis))),
    gatedUnitNormRecords_for_contrast: gated.length,
  };
  // K2: shuffled-axis control, restricted to NON-parallel partners (|cos| < 0.5) so the test is not trivially satisfied
  // by parallel axes. For each gated cylinder, take the next gated cylinder in corpus order whose axis is not parallel to it.
  const shuf = [];
  for (let i = 0; i < gatedCyl.length; i++) {
    const a = gatedCyl[i].native.axis;
    for (let k = 1; k < gatedCyl.length; k++) {
      const b = gatedCyl[(i + k) % gatedCyl.length].native.axis;
      if (Math.abs(dot(a, b)) < 0.5) { shuf.push(absCos(gatedCyl[i].vec, b)); break; }
    }
  }
  out.K2_shuffled_nonparallel_axis = { n: shuf.length, withinTol: share(shuf, d => d <= TOL), median: median(shuf), p10: shuf.sort((x, y) => x - y)[Math.floor(shuf.length * 0.1)] };
  // K3: what the vector is NOT. Reference direction x_axis and the axis itself.
  const cx = gatedCyl.map(r => absCos(r.vec, r.native.x)), ca = gatedCyl.map(r => absCos(r.vec, r.native.axis));
  out.K3_reference_direction = { n: gatedCyl.length, absCosWithXAxis_gt_1_minus_1e6: share(cx, d => d > 1 - 1e-6), absCosWithAxis_gt_1_minus_1e6: share(ca, d => d > 1 - 1e-6) };
  // K4: what the vector might be. Test radial directions built from the stored box and the native axis point.
  // h1: unit(max - center); h2: unit(center - min); h3: unit radial part of (center - pvec) about the axis.
  const radial = r => { const d = sub(r.bounds.center, r.native.pvec); const along = dot(d, r.native.axis); return unit(sub(d, r.native.axis.map(x => x * along))); };
  const h = { h1_unit_max_minus_center: r => unit(sub(r.bounds.max, r.bounds.center)), h2_unit_center_minus_min: r => unit(sub(r.bounds.center, r.bounds.min)), h3_radial_of_center_about_axis: radial };
  out.K4_candidate_directions = {};
  for (const [k, fn] of Object.entries(h)) {
    const c = gatedCyl.map(r => absCos(r.vec, fn(r)));
    out.K4_candidate_directions[k] = { n: c.length, absCosGt_1_minus_1e6: share(c, d => d > 1 - 1e-6) };
  }
  // K5: other gated surfaces against their own axis or normal.
  const other = {};
  for (const r of gated.filter(r => r.native && r.native.surface !== 'CYLINDER')) {
    const ref = r.native.axis || r.native.normal; if (!ref) continue;
    const k = r.native.surface, c = absCos(r.vec, ref);
    other[k] = other[k] || { n: 0, withinTol: 0, absCosGt_1_minus_1e6: 0 };
    other[k].n++; if (c <= TOL) other[k].withinTol++; if (c > 1 - 1e-6) other[k].absCosGt_1_minus_1e6++;
  }
  out.K5_other_native_surfaces_vs_axis_or_normal = other;
  // K6: random unit vectors against the gated cylinder axes (seeded LCG).
  let seed = 97; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let hit = 0; const N = gatedCyl.length * 20;
  for (let i = 0; i < N; i++) {
    let g; do { g = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]; } while (norm(g) < 1e-3);
    if (absCos(g, gatedCyl[i % gatedCyl.length].native.axis) <= TOL) hit++;
  }
  out.K6_random_unit_vectors = { trials: N, withinTol: hit };
  // K7 (supplementary, NOT native): the display surface record's own axis for the 2,406 tag-4002 gated faces.
  const disp = dispCylGated.filter(r => Array.isArray(r.displayDirection) && r.displayDirection.every(Number.isFinite) && norm(r.displayDirection) > 0);
  const dc = disp.map(r => absCos(r.vec, r.displayDirection));
  out.K7_supplementary_display_axis_not_native = { n: disp.length, withinTol: share(dc, d => d <= TOL), maxAbsCos: Math.max(...dc) };
  return out;
}

if (CONTROLS) {
  const c = controls();
  fs.writeFileSync(path.join(HERE, 'claim_a_controls.json'), JSON.stringify(c, null, 1));
  console.log(JSON.stringify(c, null, 1));
} else {
  const s = summarise();
  fs.writeFileSync(path.join(HERE, 'claim_a_results.json'), JSON.stringify(s, null, 1));
  console.log(JSON.stringify(s, null, 1));
}
