'use strict';
// EXP107 independent check. Does not use display-join.js geometry(). Own surface residuals, own edge-id comparison.
const fs = require('fs');
const CONV = '/home/user/conv-ids/src';
const S = require(CONV), P = require(CONV + '/parasolid/partition'), N = require(CONV + '/brep/native'), J = require(CONV + '/brep/display-join');
const modern = require(CONV + '/container/modern');

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = a => Math.hypot(a[0], a[1], a[2]);
const along = (q, a) => { const t = dot(q, a); return [q[0] - t * a[0], q[1] - t * a[1], q[2] - t * a[2]]; };

// Signed residual of point p to an analytic surface (metres); null when this check has no closed form.
function resid(s, p) {
  switch (s.type) {
    case 'plane': return dot(sub(p, s.p), s.n);
    case 'cylinder': return nrm(along(sub(p, s.p), s.a)) - s.r;
    case 'cone': {
      const q = sub(p, s.p), t = dot(q, s.a), rho = nrm(along(q, s.a));
      return (rho - (s.r + t * Math.tan(s.angle))) * Math.cos(s.angle);
    }
    case 'sphere': return nrm(sub(p, s.c)) - s.r;
    case 'torus': {
      const q = sub(p, s.c), h = dot(q, s.a), rho = nrm(along(q, s.a));
      return Math.hypot(rho - s.R, h) - s.r;
    }
  }
  return null;
}

// Map a native face's edges to their section ids (displayId), the same key the display Block1 stores.
function nativeEdgeIds(M, nf) {
  const got = new Set();
  for (const l of nf.loops || []) for (const c of l.coedges || []) {
    const e = M.edges.get(c.edge);
    if (e) got.add(e.displayId);
  }
  return got;
}

// Display face edge ids (Block1 record ids), without the 0 "no edge" entries.
function displayEdgeIds(df) {
  return new Set((df.metadata.edgeRecords || []).map(e => e.id).filter(x => x !== 0));
}

// Edge comparison: 'equal' | 'subset' (display ids all on the native face, native has more) | 'bad'
function edgeCheck(M, df, nf) {
  const want = displayEdgeIds(df), got = nativeEdgeIds(M, nf);
  const missing = [...want].filter(x => !got.has(x)).length;
  if (want.size === 0) return { res: 'none', missing: 0, nWant: 0, nGot: got.size };
  if (missing > 0) return { res: 'bad', missing, nWant: want.size, nGot: got.size };
  return { res: got.size === want.size ? 'equal' : 'subset', missing: 0, nWant: want.size, nGot: got.size };
}

// Interior display vertices (not on any boundary cycle) and their residuals to the native surface.
function surfaceCheck(df, nf) {
  const out = { type: nf.surface.type, checked: false, n: 0, max: null, over8: 0, over6: 0, reason: null };
  if (!df.vertices || !df.vertexCount) { out.reason = 'no vertices'; return out; }
  if (!df.boundaryCycles) { out.reason = 'no boundary cycles'; return out; }
  const bnd = new Set();
  for (const cy of df.boundaryCycles) for (const v of cy.vertices) bnd.add(v);
  const vs = [];
  for (let i = 0; i < df.vertexCount; i++) if (!bnd.has(i)) vs.push(i);
  if (!vs.length) { out.reason = 'no interior vertices'; return out; }
  let max = 0;
  for (const i of vs) {
    const r = resid(nf.surface, [df.vertices[3 * i], df.vertices[3 * i + 1], df.vertices[3 * i + 2]]);
    if (r === null) { out.reason = 'no closed form for ' + nf.surface.type; return out; }
    const a = Math.abs(r);
    if (a > max) max = a;
    if (a > 1e-8) out.over8++;
    if (a > 1e-6) out.over6++;
    out.n++;
  }
  out.checked = true;
  out.max = max;
  return out;
}

// Verdict: 'right' | 'wrong' | 'unchecked'. Wrong when the edge ids contradict the native face, or an interior
// vertex sits more than 1e-6 m off a checked surface (bar 1e-8 m is reported separately, see surfaceCheck.over8).
function verdict(M, df, nf) {
  const e = edgeCheck(M, df, nf), s = surfaceCheck(df, nf);
  let v;
  if (e.res === 'bad' || (s.checked && s.over6 > 0)) v = 'wrong';
  else if (e.res === 'equal' && s.checked) v = 'right';
  else if (e.res === 'equal' || s.checked) v = 'right_partial';   // one of the two checks only
  else v = 'unchecked';
  return { v, edge: e, surf: s };
}

function loadPart(file) {
  const buf = fs.readFileSync(file);
  const legacy = modern.isOLE2(new Uint8Array(buf));
  const d = S.parse(file);
  const df = d.faces.filter(f => f.metadata);
  let M = null, brepError = null;
  try { M = N.build(P.readBody(new Uint8Array(buf)).parsed); } catch (e) { brepError = e.message; }
  return { legacy, d, df, M, brepError, parseFaces: d.faces.length, rejected: (d.rejected || []).length };
}

module.exports = { resid, edgeCheck, surfaceCheck, verdict, loadPart, nativeEdgeIds, displayEdgeIds };
