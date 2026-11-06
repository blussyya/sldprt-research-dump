'use strict';
/* EXP097 blind active-geometry check. Own code for: configuration assembly (forced name), arc
 * sampling, pcurve-based face membership, interior extremes, and validation. Shared with the
 * converter (read-only use): the container/decoder modules, xt.parse, nativeModel.build,
 * Procedural.resolve, the geometry evaluator (G), display.parseSLDPRT and step export.
 * Units: metres. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/solidworks-converters/src';
const G = require(CONV + '/geom/eval.js');
const modern = require(CONV + '/container/modern.js');
const ole = require(CONV + '/container/ole.js');
const xt = require(CONV + '/parasolid/xt.js');
const partition = require(CONV + '/parasolid/partition.js');
const nativeModel = require(CONV + '/brep/native.js');
const Proc = require(CONV + '/brep/procedural.js');
const display = require(CONV + '/display.js');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const TAU = 2 * Math.PI;

function readRaw(p) { return new Uint8Array(fs.readFileSync(p)); }

function streamsOf(raw) {
  if (modern.isOLE2(raw)) {
    const o = ole.read(raw), out = {};
    for (const e of o.entries) try { out[e.name] = new Uint8Array(o.stream(e)); } catch (_) {}
    return out;
  }
  const s = modern.decompressOpenSX(raw, inflateRaw, inflateZlib), out = {};
  for (const k of Object.keys(s)) out[k] = new Uint8Array(s[k]);
  return out;
}

function partitionEntries(all) {
  return Object.keys(all).filter(k => /(?:^|\/)Config-\d+-Partition$/.test(k))
    .map(k => ({ name: k, N: +/Config-(\d+)-Partition$/.exec(k)[1] })).sort((a, b) => a.N - b.N);
}

/* Copied from partition.js (not exported there): BODY_IN_LIGHTWEIGHT_PERM per body index. */
function inPart(q) {
  const by = new Map(q.nodes.map(n => [n.index, n])), out = new Map();
  const name = d => { const n = by.get(d) && by.get(by.get(d).values.identifier); if (!n) return ''; const v = n.values.string; return Array.isArray(v) ? v.join('') : v; };
  for (const a of q.nodes) {
    if (a.type !== 81 || by.get(a.values.owner)?.type !== 12 || name(a.values.definition) !== 'BODY_IN_LIGHTWEIGHT_PERM') continue;
    const v = (a.values.fields || []).map(i => by.get(i)).find(n => n && n.type === 82);
    if (v) out.set(a.values.owner, v.values.values[0]);
  }
  return out;
}

/* Copied from partition.js (not exported there): several parse results as one. */
function merge(parts) {
  const out = { ...parts[0], nodes: [...parts[0].nodes], unresolved: [...parts[0].unresolved], sections: parts.length };
  for (const q of parts.slice(1)) {
    const off = out.nodes.reduce((m, n) => Math.max(m, n.index), 0), sh = i => i ? i + off : i;
    const idOff = out.nodes.reduce((m, n) => Math.max(m, typeof n.values.node_id === 'number' ? n.values.node_id : 0, typeof n.values.highest_node_id === 'number' ? n.values.highest_node_id : 0), 0);
    for (const n of q.nodes) {
      const values = { ...n.values };
      if (typeof values.node_id === 'number') values.node_id += idOff;
      if (typeof values.highest_node_id === 'number') values.highest_node_id += idOff;
      for (const f of new Set(n.pointers.map(p => p.field))) values[f] = Array.isArray(values[f]) ? values[f].map(sh) : sh(values[f]);
      out.nodes.push({ ...n, index: n.index + off, values, pointers: n.pointers.map(p => ({ ...p, target: p.target + off })) });
    }
    out.unresolved.push(...q.unresolved.map(u => ({ ...u, from: u.from + off, target: u.target + off })));
  }
  return out;
}

/* LocalBodies sections: same walk as partition.js embedded(), via its exported sections(). */
function embeddedSections(b) {
  const out = [], buf = Buffer.from(b.buffer, b.byteOffset, b.length), pat = Buffer.from(partition.GUID);
  for (let g = buf.indexOf(pat, 0); g >= 0; g = buf.indexOf(pat, g + 1)) {
    if (g < 4) continue;
    const size = (b[g - 4] | b[g - 3] << 8 | b[g - 2] << 16 | b[g - 1] << 24) >>> 0;
    const end = g - 4 + 4 + size; if (end > b.length) continue;
    const w = partition.sections(b.subarray(0, end), g - 4);
    if (!w.error && w.out.length === 1) out.push(w.out[0]);
  }
  return out;
}

/* Assemble one configuration: its Config-N-Partition first section, the bodies of its LocalBodies
 * that are part of the part, minus bodies flagged BODY_IN_LIGHTWEIGHT_PERM = 0. Name is forced. */
function assemble(all, name) {
  const inner = partition.extractPrimary(null, { [name]: all[name] }, undefined, {}).inner;
  let parsed = xt.parse(inner, true, {});
  if (parsed.error) return { error: parsed.error };
  const hidden = [...inPart(parsed)].filter(([, v]) => v === 0).map(([b]) => b);
  const localKey = name.replace(/^(?:Contents\/)?(Config-\d+)-Partition$/, '$1-FeatureBodies/LocalBodies');
  const localName = [localKey, 'Contents/' + localKey].find(k => all[k]) || null;
  const bodies = localName ? embeddedSections(all[localName]).map(x => xt.parse(x.body, true, {}))
    .filter(q => !q.error && q.nodes.some(n => n.type === 14) && ![...inPart(q).values()].includes(0)) : [];
  if (bodies.length) parsed = merge([parsed, ...bodies]);
  if (hidden.length) parsed = { ...parsed, hidden };
  return { parsed, localName, localBodies: bodies.length, hiddenBodies: hidden.length };
}

/* Load a file: streams, display mesh and a per-configuration parser. */
function loadFile(p) {
  const raw = readRaw(p), all = streamsOf(raw);
  const d = display.parseSLDPRT(Buffer.from(raw), inflateRaw, inflateZlib);
  const dispFaces = d.faces.map(f => ({ bounds: f.bounds, verts: f.vertices, id: f.metadata ? f.metadata.rawId : null }));
  const union = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const f of dispFaces) if (f.bounds) for (let k = 0; k < 3; k++) { union.min[k] = Math.min(union.min[k], f.bounds.min[k]); union.max[k] = Math.max(union.max[k], f.bounds.max[k]); }
  return { path: p, raw, all, configs: partitionEntries(all), headers: Object.keys(all).filter(k => /Config-\d+-ModelHeader$/.test(k)), header2: all.Header2 || (all['Contents/Header2'] || null), displayFaces: dispFaces, displayUnion: union, displayError: d.errors };
}

/* ---------- own sampling ---------- */
const newAcc = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], n: 0 });
function addPt(acc, p) { for (let k = 0; k < 3; k++) { if (p[k] < acc.min[k]) acc.min[k] = p[k]; if (p[k] > acc.max[k]) acc.max[k] = p[k]; } acc.n++; }
function mergeAcc(a, b) { for (let k = 0; k < 3; k++) { a.min[k] = Math.min(a.min[k], b.min[k]); a.max[k] = Math.max(a.max[k], b.max[k]); } a.n += b.n; return a; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const PERIODIC_U = new Set(['cylinder', 'cone', 'sphere', 'torus']);
const PERIODIC_V = new Set(['torus']);

/* Arc of a resolved edge: parameter increases from A to B, where A is the vertex the edge leaves
 * when sameSense (curve runs with the edge) and its end otherwise. Periodic curves wrap. */
function edgeArc(RE, RV) {
  const c = RE.curve;
  if (!c) return { fail: 'no curve' };
  const periodic = c.type === 'circle' || c.type === 'ellipse';
  const vs = RE.v;
  if (!vs || vs[0] == null || vs[1] == null) {           // closed ring, no vertices
    if (periodic) return { c, start: 0, delta: TAU, periodic, closed: true };
    const [a, b] = G.curveRange(c); return { c, start: a, delta: b - a, periodic: false, closed: true };
  }
  const [idA, idB] = RE.sameSense ? [vs[0], vs[1]] : [vs[1], vs[0]];
  const tA = G.curveProject(c, RV.get(idA).p).t, tB = G.curveProject(c, RV.get(idB).p).t;
  if (periodic) {
    let delta = ((tB - tA) % TAU + TAU) % TAU;
    if (idA === idB || delta < 1e-12) delta = TAU;
    return { c, start: tA, delta, periodic, closed: idA === idB };
  }
  return { c, start: tA, delta: tB - tA, periodic: false, closed: idA === idB, backward: tB < tA };
}
function inArc(arc, t) {
  if (arc.periodic) { const x = ((t - arc.start) % TAU + TAU) % TAU; return x <= arc.delta + 1e-7 || x >= TAU - 1e-7; }
  const lo = Math.min(arc.start, arc.start + arc.delta), hi = Math.max(arc.start, arc.start + arc.delta);
  return t >= lo - 1e-7 && t <= hi + 1e-7;
}
function sampleArc(arc, RV, RE) {
  const c = arc.c;
  let n;
  if (c.type === 'line') n = 1;
  else if (arc.periodic) n = Math.max(8, Math.ceil(Math.abs(arc.delta) / TAU * 4000));
  else n = 2000;
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push(G.curvePoint(c, arc.start + arc.delta * k / n));
  return pts;
}

/* Polygons (uv) of a face from its native loops and the native pcurves of their edges. */
function facePolygons(F, N, edgeSamples) {
  const polys = [], notes = [];
  const S = F.surface;
  const pu = PERIODIC_U.has(S.type), pv = PERIODIC_V.has(S.type);
  const f3 = q => G.surfaceEval(S, q[0], q[1]).p;
  let viaPcurve = 0, viaInverse = 0, maxRoundTrip = 0;
  for (const L of F.loops) {
    if (!L.coedges.length) continue;                          // lone-vertex loop: a point, no area
    const pts = []; let ok = true;
    for (const co of L.coedges) {
      const E = N.edges.get(co.edge);
      if (!E) { ok = false; notes.push('missing edge'); break; }
      const cands = (E.pcurves || []).filter(p => p.face === F.id);
      const pc = cands.length === 1 ? cands[0] : cands.length === 2 ? (co.sense ? cands[0] : cands[1]) : null;
      let seg;
      if (pc) {
        // pcurve path: the stored 2D curve, oriented by its 3D end vertices
        viaPcurve++;
        const c2 = pc.curve.c2, [a, b] = G.curveRange(c2), M = 64;
        seg = [];
        for (let k = 0; k <= M; k++) { const q = G.curvePoint(c2, a + (b - a) * k / M); seg.push([q[0], q[1]]); }
        const startV = co.sense ? E.v[0] : E.v[1], P0 = N.vertices.get(startV).p;
        if (dist(f3(seg[M]), P0) < dist(f3(seg[0]), P0)) seg.reverse();
        if (dist(f3(seg[0]), P0) > 1e-6) notes.push('pcurve start off vertex ' + dist(f3(seg[0]), P0).toExponential(2));
      } else {
        // no pcurve: the edge's own sampled 3D arc, mapped to (u, v) by the surface inverse
        // (round trip checked), in coedge direction: forward when the coedge and the arc agree
        const es = edgeSamples.get(co.edge);
        if (!es) { ok = false; notes.push('no pcurve and no 3D arc for coedge'); break; }
        viaInverse++;
        const p3 = co.sense === E.sameSense ? es.pts : es.pts.slice().reverse();
        seg = p3.map(p => { const r = G.surfaceInverse(S, p, null); const e = G.surfaceEval(S, r.u, r.v).p; const rt = dist(e, p); if (rt > maxRoundTrip) maxRoundTrip = rt; return [r.u, r.v]; });
      }
      for (const q of seg) {
        let [u, v] = q;
        if (pts.length) { const l = pts[pts.length - 1]; if (pu) u -= TAU * Math.round((u - l[0]) / TAU); if (pv) v -= TAU * Math.round((v - l[1]) / TAU); }
        pts.push([u, v]);
      }
    }
    if (!ok || pts.length < 4) { polys.push(null); continue; }
    // close: shift the last point by whole periods onto the first
    const f = pts[0], l = pts[pts.length - 1];
    let gu = f[0] - l[0], gv = f[1] - l[1];
    if (pu) gu -= TAU * Math.round(gu / TAU);
    if (pv) gv -= TAU * Math.round(gv / TAU);
    if (Math.hypot(gu, gv) > 1e-6) notes.push('loop not closed in uv by ' + Math.hypot(gu, gv).toExponential(2));
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
    if (Math.abs(area) < 1e-12) notes.push('degenerate uv loop');
    polys.push({ pts: pts.slice(0, -1), bb: [Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))], area });
  }
  return { polys, notes, pu, pv, viaPcurve, viaInverse, maxRoundTrip };
}
function pip(poly, u, v) {
  const p = poly.pts; let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFace(polys, pu, pv, u, v) {
  let parity = 0;
  for (const poly of polys) {
    if (!poly) return null;
    if (u < poly.bb[0] - TAU || u > poly.bb[1] + TAU || v < poly.bb[2] - TAU || v > poly.bb[3] + TAU) continue;
    let hit = false;
    for (const k of (pu ? [-1, 0, 1] : [0])) for (const l of (pv ? [-1, 0, 1] : [0])) {
      if (hit) break;
      const uu = u + k * TAU, vv = v + l * TAU;
      if (uu < poly.bb[0] || uu > poly.bb[1] || vv < poly.bb[2] || vv > poly.bb[3]) continue;
      if (pip(poly, uu, vv)) hit = true;
    }
    if (hit) parity ^= 1;
  }
  return parity === 1;
}

/* Interior extremes of a face: grid, then pattern search on each axis direction, all kept inside. */
function faceInterior(F, fp, N_GRID) {
  const acc = newAcc(), S = F.surface;
  const good = fp.polys.filter(Boolean);
  if (!good.length) return { acc, note: 'no usable uv polygon' };
  const umin = Math.min(...good.map(p => p.bb[0])), umax = Math.max(...good.map(p => p.bb[1]));
  const vmin = Math.min(...good.map(p => p.bb[2])), vmax = Math.max(...good.map(p => p.bb[3]));
  const best = DIRS.map(() => ({ val: -Infinity, u: 0, v: 0 }));
  const n = N_GRID;
  let inside = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = umin + (umax - umin) * (i + 0.5) / n, v = vmin + (vmax - vmin) * (j + 0.5) / n;
    if (!inFace(fp.polys, fp.pu, fp.pv, u, v)) continue;
    inside++;
    const p = G.surfaceEval(S, u, v).p; addPt(acc, p);
    DIRS.forEach((d, k) => { const val = dot(d, p); if (val > best[k].val) best[k] = { val, u, v }; });
  }
  const hu0 = (umax - umin) / n, hv0 = (vmax - vmin) / n;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  DIRS.forEach((d, k) => {
    if (best[k].val === -Infinity) return;
    let { u, v } = best[k], hu = hu0, hv = hv0, cur = best[k].val;
    for (let it = 0; it < 500 && hu > 1e-13 && hv > 1e-13; it++) {
      let improved = false;
      for (const [a, b] of steps) {
        const uu = u + a * hu, vv = v + b * hv;
        if (!inFace(fp.polys, fp.pu, fp.pv, uu, vv)) continue;
        const val = dot(d, G.surfaceEval(S, uu, vv).p);
        if (val > cur) { cur = val; u = uu; v = vv; improved = true; break; }
      }
      if (!improved) { hu /= 2; hv /= 2; }
    }
    addPt(acc, G.surfaceEval(S, u, v).p);
  });
  return { acc, inside, note: null };
}

/* Measure one assembled configuration. Returns B-rep bounds (vertices+edges+faces) and checks. */
function measure(parsed, opts) {
  opts = opts || {};
  const res = { ok: true };
  let N, R;
  try { N = nativeModel.build(parsed); } catch (e) { return { ok: false, error: 'build: ' + e.message }; }
  try { R = Proc.resolve(N); } catch (e) { return { ok: false, error: 'resolve: ' + e.message }; }
  const RV = R.vertices instanceof Map ? R.vertices : new Map(R.vertices.map(v => [v.id, v]));
  const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
  const vertexAcc = newAcc();
  for (const v of N.vertices.values()) addPt(vertexAcc, v.p);
  const edgeSamples = new Map(), edgeChecks = { checked: 0, offCurve: 0, outsideArc: 0, maxOffCurve: 0, noCurve: 0, backward: 0, closedMismatch: 0 };
  const edgeAcc = newAcc();
  for (const [id, E] of N.edges) {
    const RErec = RE.get(id);
    if (!RErec) { edgeChecks.noCurve++; continue; }
    const arc = edgeArc(RErec, RV);
    if (arc.fail) { edgeChecks.noCurve++; continue; }
    if (arc.backward) edgeChecks.backward++;
    const pts = sampleArc(arc, RV, RErec);
    edgeSamples.set(id, { pts, arc });
    for (const p of pts) addPt(edgeAcc, p);
    // validation: pcurves of this edge, mapped to 3D, must sit on this arc
    for (const pc of (E.pcurves || [])) {
      const c2 = pc.curve.c2, [a, b] = G.curveRange(c2), S = pc.curve.surface;
      if (!S) continue;
      for (let k = 0; k <= 12; k++) {
        const q = G.curvePoint(c2, a + (b - a) * k / 12);
        const p3 = G.surfaceEval(S, q[0], q[1]).p;
        if (arc.c.type === 'line') {
          const t = G.curveProject(arc.c, p3); const d = t.d;
          edgeChecks.checked++; if (d > edgeChecks.maxOffCurve) edgeChecks.maxOffCurve = d;
          if (d > 1e-6) edgeChecks.offCurve++;
          if (!inArc(arc, t.t) && arc.c.type === 'line') { /* line param is the projection; test in arc range */ edgeChecks.outsideArc++; }
          continue;
        }
        const t = G.curveProject(arc.c, p3);
        edgeChecks.checked++;
        if (t.d > edgeChecks.maxOffCurve) edgeChecks.maxOffCurve = t.d;
        if (t.d > 1e-6) edgeChecks.offCurve++;
        else if (!inArc(arc, t.t)) edgeChecks.outsideArc++;
      }
    }
  }
  // per face
  const faceBoxes = [], faceNotes = [];
  let polyFail = 0, interiorSkipped = 0, procFaces = 0, faceTotal = 0;
  const fullAcc = newAcc();
  const loneVerts = new Set();
  for (const F of N.faces) {
    faceTotal++;
    const fa = newAcc();
    for (const L of F.loops) for (const co of L.coedges) {
      const es = edgeSamples.get(co.edge); if (es) for (const p of es.pts) addPt(fa, p);
    }
    // a loop with no edge is one vertex: a point of the face
    for (const L of F.loops) if (!L.coedges.length && L.vertex != null) { loneVerts.add(L.vertex); addPt(fa, N.vertices.get(L.vertex).p); }
    if (['blend', 'blendBound'].includes(F.surface.type)) { procFaces++; faceNotes.push('procedural surface, interior not sampled'); faceBoxes.push({ id: F.id, acc: fa, interior: 'skipped' }); mergeAcc(fullAcc, fa); continue; }
    const fp = facePolygons(F, N, edgeSamples);
    if (fp.notes.length) faceNotes.push({ id: F.id, notes: fp.notes });
    const usable = fp.polys.length && fp.polys.every(Boolean);
    let interior = null;
    if (!usable) { polyFail++; interiorSkipped++; }
    else { interior = faceInterior(F, fp, opts.grid || 60); if (interior.note) { interiorSkipped++; } else { mergeAcc(fa, interior.acc); } }
    faceBoxes.push({ id: F.id, type: F.surface.type, acc: fa, interior: usable && !(interior && interior.note) ? 'sampled' : 'skipped', viaPcurve: fp.viaPcurve, viaInverse: fp.viaInverse, maxRoundTrip: fp.maxRoundTrip });
    mergeAcc(fullAcc, fa);
  }
  // Body box = faces (their edges, lone vertices and interior). Vertices in no edge and no face
  // loop are reported as isolated; they are not part of any face and are left out of the box.
  const usedV = new Set(); for (const E of N.edges.values()) if (E.v) for (const x of E.v) if (x != null) usedV.add(x);
  const isolated = [...N.vertices.values()].filter(v => !usedV.has(v.id) && !loneVerts.has(v.id));
  const isolatedAcc = newAcc(); for (const v of isolated) addPt(isolatedAcc, v.p);
  const boundaryAcc = mergeAcc(mergeAcc(newAcc(), edgeAcc), (() => { const a = newAcc(); for (const v of N.vertices.values()) if (loneVerts.has(v.id)) addPt(a, v.p); return a; })());
  return { ok: true, nativeFaces: N.faces.length, resolvedFitted: R.report ? R.report.fittedCurves + R.report.fittedSurfaces : null,
    vertices: N.vertices.size, edges: N.edges.size, isolatedVertices: isolated.length, isolatedBox: isolatedAcc,
    boundaryBox: boundaryAcc, fullBox: fullAcc, edgeChecks,
    faces: faceBoxes, polyFail, interiorSkipped, procFaces, faceNotes, parsedError: parsed.error || null, hidden: parsed.hidden ? parsed.hidden.length : 0 };
}

function boxDiff(a, b) { let m = 0; for (let k = 0; k < 3; k++) { m = Math.max(m, Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k])); } return m; }
function matchFaces(displayFaces, nativeBoxes, tol) {
  const used = new Array(nativeBoxes.length).fill(false); let matched = 0, unmatched = [];
  for (const df of displayFaces) {
    if (!df.bounds) continue;
    const db = { min: df.bounds.min, max: df.bounds.max };
    let best = -1, bd = Infinity;
    nativeBoxes.forEach((nb, i) => { if (used[i]) return; const d = boxDiff(nb, db); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= tol) { used[best] = true; matched++; } else unmatched.push(bd);
  }
  return { matched, unmatchedDisplay: unmatched.length, worstUnmatched: unmatched.length ? Math.max(...unmatched) : 0 };
}

module.exports = { facePolygons, edgeArc, sampleArc, readRaw, streamsOf, partitionEntries, assemble, loadFile, measure, boxDiff, matchFaces, newAcc, addPt, mergeAcc, G, CONV, display, Proc, nativeModel, xt, partition };
