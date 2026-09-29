#!/usr/bin/env node
'use strict';
/* EXP-074 — does the display layer join the decoded B-rep by identity, and do
 * the decoded surfaces pass through the display mesh?
 *
 * Two independently built readers meet here:
 *   - parser/v0.3 reads DisplayLists (tessellation, per-face metadata). Its
 *     layout was established from file bytes in v0.4.x, long before any
 *     Parasolid record was decoded.
 *   - EXP-071's typed reader decodes the native Config-0-Partition B-rep
 *     (EXP-072 extraction).
 * Neither consults the other. If the Parasolid decode is right, three things
 * must hold that neither reader was built to make true:
 *
 *   A. identity   display metadata rawId      == native FACE.node_id
 *                 display metadata edge ids   == native EDGE.node_id of the
 *                                                edges bounding that face
 *   B. type       display type tag            -> one native surface type
 *   C. geometry   every display vertex of a face lies on the native surface
 *                 of the face it is joined to, and the display normals agree
 *                 with the surface normal oriented by surface.sense*face.sense
 *
 * C uses the A join, not a search, so a wrong join cannot hide behind a
 * coincidental best fit. Legacy SW2011 display metadata is not decoded, so
 * legacy faces get C only, by best-fit search, reported separately.
 *
 * D localises every vertex that C finds off its surface: is it on a display
 * boundary (a triangle edge carrying a native edge id) and does it lie on the
 * straight segment between two on-surface vertices of the same face?
 *
 * E walks every *Partition stream (and any other stream carrying the
 * partition GUID) as a chain of self-sized sections, and, where the primary
 * partition holds no faces, looks for the body in such a section elsewhere and
 * joins that instead.
 *
 * Surface residuals are written here from the field names alone; nothing is
 * reused from the EXP-071 audit. Display vertices are float32.
 *
 *   node knowledge/evidence/scripts/EXP074/display-native-join.js [--write]
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const display = require(path.join(ROOT, 'parser/v0.3/src/parser-core'));
const { parse } = require('../EXP071/typed-reader');
const { extract } = require('../EXP072/native-partitions');
const V1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core')), OLE = require(path.join(ROOT, 'parser/v0.3/src/ole-reader'));
const GUID = Buffer.from('231dd571da8148a2a85898b21b89ef99', 'hex');

const ON = 1e-6;       // on-surface threshold, metres (float32 at 0.1 m is ~7e-9)
const CHORD = 1e-7;    // on-segment threshold for D
const INV025 = { 4001: 'PLANE', 4002: 'CYLINDER', 4003: 'CONE', 4004: 'SPHERE', 4005: 'TORUS', 4006: 'B_SURFACE' };
const NAME = { 50: 'plane', 51: 'cylinder', 52: 'cone', 53: 'sphere', 54: 'torus' };
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a, k) => a.map(x => x * k), norm = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => scale(a, 1 / norm(a));
const vec = (arr, i) => [arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]];

/* Signed residual and outward gradient for each analytic type. The normal is
 * undefined on the axis of a surface of revolution (a cone apex): n = null. */
function surface(s, p) {
  const v = s.values;
  switch (s.type) {
    case 50: return { r: dot(sub(p, v.pvec), v.normal), n: v.normal };
    case 51: { const d = sub(p, v.pvec), h = dot(d, v.axis), rad = sub(d, scale(v.axis, h)), rho = norm(rad);
      return { r: rho - v.radius, n: rho > 1e-9 ? scale(rad, 1 / rho) : null }; }
    case 52: { const d = sub(p, v.pvec), h = dot(d, v.axis), rad = sub(d, scale(v.axis, h)), rho = norm(rad),
        t = v.sin_half_angle / v.cos_half_angle;
      return { r: (rho - (v.radius + h * t)) * v.cos_half_angle,
        n: rho > 1e-9 ? unit(sub(scale(rad, 1 / rho), scale(v.axis, t))) : null }; }
    case 53: { const d = sub(p, v.centre); return { r: norm(d) - v.radius, n: scale(d, 1 / norm(d)) }; }
    case 54: { const d = sub(p, v.centre), h = dot(d, v.axis), rad = sub(d, scale(v.axis, h)), rho = norm(rad),
        q = sub(d, scale(rad, v.major_radius / rho)), m = norm(q);
      return { r: m - v.minor_radius, n: scale(q, 1 / m) }; }
  }
  return null;
}

function faceEdges(m, face) {
  const ids = new Set();
  for (let l = face.values.loop, g = 0; l && g < 1e4; g++) {
    const loop = m.get(l); if (!loop) break;
    const first = loop.values.fin;
    for (let f = first, k = 0; f && k < 1e5; k++) {
      const fin = m.get(f); if (!fin) break;
      if (fin.values.edge) ids.add(m.get(fin.values.edge).values.node_id);
      f = fin.values.forward; if (f === first) break;
    }
    l = loop.values.next;
  }
  return ids;
}

/* The largest tolerance declared on any edge or vertex bounding a face; null
 * where every one is null (Parasolid's default precision). */
function faceTolerance(m, face) {
  let t = null;
  const take = n => { if (n && typeof n.values.tolerance === 'number') t = Math.max(t ?? 0, n.values.tolerance); };
  for (let l = face.values.loop, g = 0; l && g < 1e4; g++) {
    const loop = m.get(l); if (!loop) break;
    const first = loop.values.fin;
    for (let f = first, k = 0; f && k < 1e5; k++) {
      const fin = m.get(f); if (!fin) break;
      take(m.get(fin.values.edge)); take(m.get(fin.values.vertex));
      f = fin.values.forward; if (f === first) break;
    }
    l = loop.values.next;
  }
  return t;
}

function fit(s, face, df) {
  let maxR = 0, agree = 0, oppose = 0, other = 0, undef = 0; const R = [];
  const sign = (s.values.sense === '-' ? -1 : 1) * (face.values.sense === '-' ? -1 : 1);
  for (let i = 0; i < df.vertexCount; i++) {
    const p = vec(df.vertices, i), dn = vec(df.normals, i), e = surface(s, p);
    R.push(e.r); maxR = Math.max(maxR, Math.abs(e.r));
    if (!e.n) { undef++; continue; }
    const c = dot(scale(e.n, sign), dn) / (norm(dn) || 1);
    if (c > 0.99) agree++; else if (c < -0.99) oppose++; else other++;
  }
  return { maxR, agree, oppose, other, undef, R };
}

/* D: where do off-surface vertices sit? */
function localise(df, R, edgeCurve) {
  const onIdx = []; for (let i = 0; i < R.length; i++) if (Math.abs(R[i]) <= 1e-8) onIdx.push(i);
  const bnd = new Map();
  for (const e of df.edgeAnnotations) if (e.id) for (const v of e.vertices) (bnd.get(v) || bnd.set(v, new Set()).get(v)).add(e.id);
  const out = [];
  for (let i = 0; i < R.length; i++) {
    if (Math.abs(R[i]) <= ON) continue;
    const p = vec(df.vertices, i);
    const near = onIdx.map(j => [norm(sub(vec(df.vertices, j), p)), j]).sort((a, b) => a[0] - b[0]).slice(0, 16).map(x => vec(df.vertices, x[1]));
    let best = { d: Infinity, t: null };
    for (let a = 0; a < near.length; a++) for (let b = a + 1; b < near.length; b++) {
      const ab = sub(near[b], near[a]), t = dot(sub(p, near[a]), ab) / dot(ab, ab);
      if (t <= 1e-6 || t >= 1 - 1e-6) continue;
      const d = norm(sub(p, near[a].map((x, k) => x + t * ab[k])));
      if (d < best.d) best = { d, t: Math.min(t, 1 - t) };
    }
    const curves = bnd.has(i) ? [...bnd.get(i)].map(id => edgeCurve(id)).sort().join('+') : null;
    out.push({ r: R[i], boundary: curves, chord: best.d <= CHORD, chordD: best.d, t: best.t });
  }
  return out;
}

function streams(raw) {
  if (raw.subarray(0, 4).toString('hex') === 'd0cf11e0') {
    const o = OLE.read(raw), out = {};
    for (const e of o.entries) try { out[e.name] = Buffer.from(o.stream(e)); } catch (_) { /* storage entries */ }
    return out;
  }
  const s = V1.decompressOpenSX(raw, b => zlib.inflateRawSync(b), b => zlib.inflateSync(b)), out = {};
  for (const k of Object.keys(s)) out[k] = Buffer.from(s[k]);
  return out;
}
/* E. A section: u32le size | 16-byte GUID | u32le inflated | u32le compressed
 * | zlib(compressed) | 8 bytes; size counts everything after itself. */
function sections(b, pos) {
  const out = [];
  while (pos < b.length) {
    if (pos + 28 > b.length) return { out, error: `leftover ${b.length - pos}` };
    const size = b.readUInt32LE(pos), guid = b.subarray(pos + 4, pos + 20), inflated = b.readUInt32LE(pos + 20), compressed = b.readUInt32LE(pos + 24);
    if (!guid.equals(GUID)) return { out, error: 'guid' };
    if (size !== compressed + 32) return { out, error: 'size != compressed+32' };
    let body; try { body = zlib.inflateSync(b.subarray(pos + 28, pos + 28 + compressed)); } catch (_) { return { out, error: 'zlib' }; }
    if (body.length !== inflated) return { out, error: 'inflated length' };
    const kind = (body.subarray(0, 64).toString('latin1').match(/TRANSMIT FILE(?: \((\w+)\))?/) || [])[1] || (/TRANSMIT FILE/.test(body.subarray(0, 64).toString('latin1')) ? 'plain' : '?');
    out.push({ start: pos, kind, body, tail: b.subarray(pos + 28 + compressed, pos + 36 + compressed).toString('hex') });
    pos += 4 + size;
  }
  return { out, error: null };
}
const E = { streams: {}, sectionSequence: {}, tailBytes: {}, prefixBeforeFirstSection: {}, bodyFallback: [] };
const bumpE = (o, k) => o[k] = (o[k] || 0) + 1;

const files = [];
for (const era of ['SW2022', 'SW2011'])
  for (const d of fs.readdirSync(path.join(ROOT, 'test files new', era)).sort()) {
    const f = path.join(ROOT, 'test files new', era, d, 'model.SLDPRT');
    if (fs.existsSync(f)) files.push({ set: era, f });
  }
(function w(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) w(p); else if (/\.sldprt$/i.test(e.name)) files.push({ set: 'original', f: p });
  }
})(path.join(ROOT, 'test files original'));

const T = {}, bump = (set, k, n = 1) => { (T[set] ||= {})[k] = (T[set][k] || 0) + n; };
const cross = {}, geo = {}, D = {}, notes = [], failures = [], offFaces = [];
for (const { set, f } of files) {
  const rel = path.relative(ROOT, f), raw = fs.readFileSync(f);
  let nat, dis, source = 'Config-0-Partition';
  let all = {}; try { all = streams(raw); } catch (_) { bumpE(E.streams, 'container unread'); }
  for (const [k, b] of Object.entries(all)) {
    const g = b.indexOf(GUID); if (g < 4) continue;
    const name = k.replace(/^.*\//, '').replace(/\d+/g, 'N');
    if (/Partition$/.test(k)) {        // whole stream: a chain of sections from byte 0
      const w = sections(b, g - 4);
      bumpE(E.streams, `${name}: ${w.error ? 'chain broken (' + w.error + ')' : 'chains exactly to end'}`);
      bumpE(E.sectionSequence, `${name}: ${w.out.map(x => x.kind).join(' | ')}`);
      bumpE(E.prefixBeforeFirstSection, `${name}: ${g - 4} bytes`);
      for (const x of w.out) bumpE(E.tailBytes, x.tail);
    } else {                           // elsewhere: every GUID occurrence tried as one section
      const found = [];
      for (let h = g; h >= 4; h = b.indexOf(GUID, h + 1)) {
        const w = sections(b.subarray(0, h - 4 + 4 + b.readUInt32LE(h - 4)), h - 4);
        if (w.error || w.out.length !== 1) { bumpE(E.streams, `${name}: GUID not heading a valid section`); continue; }
        const x = w.out[0], q = parse(x.body, true); bumpE(E.tailBytes, x.tail);
        const qm = q.error ? null : new Map(q.nodes.map(n => [n.index, n])), qf = q.error ? [] : q.nodes.filter(n => n.type === 14);
        found.push({ offset: x.start, kind: x.kind, nodes: q.error ? null : q.nodes.length, faces: q.error ? null : qf.length,
          surfaces: [...new Set(qf.map(n => (qm.get(n.values.surface) || {}).name))].join('+'),
          bodyTypeValues: q.error ? null : [...new Set(q.nodes.filter(n => n.type === 12).map(n => n.values.body_type))].join('+') });
      }
      bumpE(E.streams, `${name}: ${found.length} embedded section(s)`);
      (E.embedded ||= []).push({ file: rel, stream: k, streamBytes: b.length, sections: found });
    }
  }
  try { nat = parse(extract(raw).inner, true); if (nat.error) throw Error(nat.error); }
  catch (e) { notes.push(`${rel}: native not read (${e.message.slice(0, 60)})`); bump(set, 'files_native_unread'); continue; }
  try { dis = display.parseSLDPRT(raw, b => zlib.inflateRawSync(b), b => zlib.inflateSync(b)); }
  catch (e) { notes.push(`${rel}: display not read`); bump(set, 'files_display_unread'); continue; }
  if (!nat.nodes.some(n => n.type === 14))
    for (const [k, b] of Object.entries(all)) {
      const g = b.indexOf(GUID); if (g < 4 || /Partition$/.test(k)) continue;
      for (const x of sections(b, g - 4).out) {
        const q = parse(x.body, true);
        if (!q.error && q.nodes.some(n => n.type === 14)) { nat = q; source = k;
          E.bodyFallback.push({ file: rel, stream: k, sectionOffset: x.start, kind: x.kind, prefixHex: b.subarray(0, g - 4).toString('hex'),
            faces: q.nodes.filter(n => n.type === 14).length, displayFaces: dis.faces.length }); }
      }
    }
  if (source !== 'Config-0-Partition') notes.push(`${rel}: primary partition has 0 faces; body read from ${source}`);
  const m = new Map(nat.nodes.map(n => [n.index, n]));
  const nFaces = nat.nodes.filter(n => n.type === 14), byId = new Map(nFaces.map(n => [n.values.node_id, n]));
  const edgeById = new Map(nat.nodes.filter(n => n.type === 16).map(n => [n.values.node_id, n]));
  const edgeCurve = id => { const e = edgeById.get(id), c = e && m.get(e.values.curve); return e ? (c ? c.name : 'no-curve') : 'unknown'; };
  if (!nFaces.length) { notes.push(`${rel}: native payload has 0 faces, display has ${dis.faces.length}`); bump(set, 'files_native_empty'); continue; }
  bump(set, 'files'); bump(set, 'display_faces', dis.faces.length); bump(set, 'native_faces', nFaces.length);
  const legacy = dis.format && /legacy/i.test(dis.format);
  const joined = new Set();
  for (const [i, df] of dis.faces.entries()) {
    let face, s, r;
    if (!legacy && df.metadata) {
      // A. identity
      face = byId.get(df.metadata.rawId);
      if (!face) { bump(set, 'A_face_id_unmatched'); failures.push(`${rel} face ${i}: rawId ${df.metadata.rawId} not a FACE node_id`); continue; }
      bump(set, 'A_face_id_matched'); joined.add(face.index);
      const want = faceEdges(m, face), got = new Set(df.metadata.edgeRecords.map(e => e.id));
      const b1 = new Set(df.edgeAnnotations.map(e => e.id).filter(x => x));
      const same = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
      if (same(want, got)) bump(set, 'A_edge_set_equal');
      else if (!got.size) bump(set, 'A_edge_table_empty');
      else { bump(set, 'A_edge_set_differs'); failures.push(`${rel} face ${i}: edges display[${[...got]}] native[${[...want]}]`); }
      if (b1.size) bump(set, same(want, b1) ? 'A_block1_edge_set_equal' : 'A_block1_edge_set_differs');
      // B. type: a crosstab, so tags outside INV-025 are identified rather than failed
      s = m.get(face.values.surface);
      const tag = df.metadata.typeTag, key = `${tag}->${s.name}`;
      (cross[set] ||= {})[key] = (cross[set][key] || 0) + 1;
      if (INV025[tag]) {
        if (INV025[tag] === s.name) bump(set, 'B_INV025_agree');
        else { bump(set, 'B_INV025_disagree'); failures.push(`${rel} face ${i}: tag ${tag} vs native ${s.name}`); }
      } else bump(set, 'B_tag_outside_INV025');
      if (!NAME[s.type]) { bump(set, `C_unevaluated_${s.name}`); continue; }
      r = fit(s, face, df);
    } else if (legacy) {
      // C by search: the analytic native face that best fits this display face.
      // A candidate must also orient every defined normal one way: a disk whose
      // vertices are all on its rim otherwise fits the cylinder it closes.
      let best = null;
      for (const nf of nFaces) {
        const ns = m.get(nf.values.surface); if (!NAME[ns.type]) continue;
        const q = fit(ns, nf, df); if (q.maxR > ON || q.other) continue;
        if (!best || q.maxR < best.r.maxR) best = { nf, ns, r: q };
      }
      if (!best) { bump(set, 'C_legacy_no_analytic_fit'); continue; }
      face = best.nf; s = best.ns; r = best.r;
      if (joined.has(face.index)) { bump(set, 'C_legacy_fit_reused'); notes.push(`${rel}: legacy display face ${i} best-fits native face node ${face.values.node_id}, already taken`); }
      joined.add(face.index);
    } else { bump(set, 'display_face_without_metadata'); continue; }
    // C. geometry, on the joined surface
    const k = `${set}/${NAME[s.type]}`;
    const g = (geo[k] ||= { faces: 0, vertices: 0, facesOn: 0, maxResidualOnFaces: 0, maxResidualAll: 0, normalAgree: 0, normalOppose: 0, normalOther: 0, normalUndefined: 0 });
    g.faces++; g.vertices += df.vertexCount; g.maxResidualAll = Math.max(g.maxResidualAll, r.maxR);
    g.normalAgree += r.agree; g.normalOppose += r.oppose; g.normalOther += r.other; g.normalUndefined += r.undef;
    if (r.maxR <= ON) { g.facesOn++; g.maxResidualOnFaces = Math.max(g.maxResidualOnFaces, r.maxR); bump(set, 'C_on_surface'); continue; }
    bump(set, 'C_off_surface');
    // D. localise the off-surface vertices (modern only: needs edge annotations)
    const loc = localise(df, r.R, edgeCurve), d = (D[set] ||= { vertices: 0, boundary: 0, interior: 0, onChord: 0, notOnChord: 0,
      boundaryByCurve: {}, interiorOnChord: 0, chordT: {}, maxResidual: 0, facesWithDeclaredTolerance: 0, withinDeclaredTolerance: 0 });
    // Hypothesis: the offset is the face's declared edge/vertex tolerance.
    const tol = legacy ? null : faceTolerance(m, face);
    if (tol !== null) d.facesWithDeclaredTolerance++;
    for (const o of loc) {
      d.vertices++; d.maxResidual = Math.max(d.maxResidual, Math.abs(o.r));
      if (tol !== null && Math.abs(o.r) <= tol) d.withinDeclaredTolerance++;
      if (o.boundary) { d.boundary++; d.boundaryByCurve[o.boundary] = (d.boundaryByCurve[o.boundary] || 0) + 1; } else d.interior++;
      if (o.chord) { d.onChord++; if (!o.boundary) d.interiorOnChord++;
        const tk = Math.abs(o.t - 1 / 3) < 1e-3 ? '1/3' : Math.abs(o.t - 1 / 2) < 1e-3 ? '1/2' : Math.abs(o.t - 1 / 4) < 1e-3 ? '1/4' : 'other';
        d.chordT[tk] = (d.chordT[tk] || 0) + 1; } else d.notOnChord++;
    }
    offFaces.push({ file: rel, face: i, surface: NAME[s.type], maxResidual: +r.maxR.toExponential(3), declaredTolerance: tol, offVertices: loc.length,
      boundary: loc.filter(o => o.boundary).length, onChord: loc.filter(o => o.chord).length,
      maxChordDistance: +Math.max(...loc.filter(o => o.chord).map(o => o.chordD), 0).toExponential(2) });
  }
  if (!legacy) bump(set, 'A_native_faces_not_joined', nFaces.filter(n => !joined.has(n.index)).length);
}
const chordFree = Object.fromEntries(Object.entries(geo).map(([k, g]) => [k, g]));
const result = { experiment: 'EXP-074', thresholds: { onSurface: ON, onChord: CHORD }, counts: T, typeCrosstab: cross,
  geometry: chordFree, offSurfaceLocalisation: D, partitionSections: E, offSurfaceFaces: offFaces, notes, failures };

console.log('Counts by corpus'); console.log(JSON.stringify(T, null, 1));
console.log('\nB. display type tag -> native surface type'); console.log(JSON.stringify(cross, null, 1));
console.log('\nC. geometry by corpus/surface (residual in metres; normals vs surface normal oriented by surface.sense*face.sense)');
console.log('set/type'.padEnd(20) + ['faces', 'on', 'max on', 'max all', 'agree', 'oppose', 'other', 'undef'].map(x => x.padStart(10)).join(''));
for (const k of Object.keys(geo).sort()) { const g = geo[k];
  console.log(k.padEnd(20) + [g.faces, g.facesOn, g.maxResidualOnFaces.toExponential(2), g.maxResidualAll.toExponential(2),
    g.normalAgree, g.normalOppose, g.normalOther, g.normalUndefined].map(x => String(x).padStart(10)).join('')); }
console.log('\nD. off-surface vertices'); console.log(JSON.stringify(D, null, 1));
console.log('\nE. partition sections'); console.log(JSON.stringify({ ...E, bodyFallback: E.bodyFallback.map(x => ({ ...x, prefixHex: x.prefixHex.slice(0, 80) + '...' })) }, null, 1));
console.log(`\nNotes (${notes.length}):`); notes.forEach(n => console.log('  ' + n));
console.log(`\nFailures (${failures.length}):`); failures.slice(0, 40).forEach(n => console.log('  ' + n));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(__dirname, 'RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
