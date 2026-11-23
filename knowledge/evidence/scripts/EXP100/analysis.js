'use strict';
// EXP100: does display typeTag 4010 mean SPUN_SURF and 4008 mean OFFSET_SURF?
// Methods: (A) rawId join (baseline, what the claim relies on); (B) geometric fit of display mesh
// vertices to the native surface; (C) blind best-fit matching with no ID input; (D) axis test from
// display normals; plus controls 4002 cylinder and 4003 cone. Bar for geometry: 1e-8 m.
const fs = require('fs');
const C = '/home/user/conv-dev/src';
const display = require(C);
const native = require(C + '/brep/native');
const E = require(C + '/geom/eval');
const BAR = 1e-8;
const FILES = {
  a4ecc6f5: '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT',
  '8cd79ff5': '/home/user/sldprt-research-dump/test files online/2019/8cd79ff5_1ESxx.SLDPRT',
  '2f121983': '/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT',
};
const TAGS = [4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010];
const doBlind = process.env.BLIND !== '0';
const out = {bar_m: BAR, parts: {}};

function sampleVerts(f, max) {
  const n = f.vertexCount, step = Math.max(1, Math.floor(n / max)), pts = [];
  for (let i = 0; i < n; i += step) pts.push([f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]]);
  return pts;
}
function safeDist(surf, p) {
  try { return Math.abs(E.surfaceDistance(surf, p).d); } catch (e) { return NaN; }
}
function stats(ds) {
  const v = ds.filter(x => Number.isFinite(x));
  if (!v.length) return {n: 0};
  const sorted = [...v].sort((a,b)=>a-b);
  return {n: v.length, max: Math.max(...v), mean: v.reduce((a,b)=>a+b,0)/v.length,
    p95: sorted[Math.floor(0.95*(sorted.length-1))], over_bar: v.filter(x => x > BAR).length, nan: ds.length - v.length};
}
// axis test: for a surface of revolution, the normal lies in the meridian plane through the axis,
// so n . (a x r) = 0 where r is the radial vector from the axis to p. Uses display normals and the
// display direction as the axis; the native base point gives the axis line.
function axisTest(f, a, base) {
  const res = [];
  const n = f.vertexCount, step = Math.max(1, Math.floor(n / 60));
  for (let i = 0; i < n; i += step) {
    const p = [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]];
    const nn = [f.normals[i*3], f.normals[i*3+1], f.normals[i*3+2]];
    const q = [p[0]-base[0], p[1]-base[1], p[2]-base[2]];
    const h = q[0]*a[0]+q[1]*a[1]+q[2]*a[2];
    const r = [q[0]-h*a[0], q[1]-h*a[1], q[2]-h*a[2]];
    const rl = Math.hypot(...r); if (rl < 1e-6) continue;
    const t = [a[1]*r[2]-a[2]*r[1], a[2]*r[0]-a[0]*r[2], a[0]*r[1]-a[1]*r[0]];
    const nl = Math.hypot(...nn); if (nl === 0) continue;
    res.push(Math.abs(nn[0]*t[0]+nn[1]*t[1]+nn[2]*t[2]) / (nl * Math.hypot(...t)));
  }
  return res;
}

for (const [name, path] of Object.entries(FILES)) {
  const t0 = Date.now();
  const d = display.parse(path);
  const body = require(C + '/index').readBrep(path);
  const b = native.build(body.parsed);
  const byId = new Map();
  for (const nf of b.faces) { if (!byId.has(nf.id)) byId.set(nf.id, []); byId.get(nf.id).push(nf); }
  const ids = d.faces.map(f => f.metadata.rawId);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  const part = {display_faces: d.faces.length, native_faces: b.faces.length,
    native_by_type: {}, display_tags: {}, duplicate_rawIds: [...new Set(dup)].length, crosstab: {}, unjoined: [],
    geom_by_tag: {}, axis_by_tag: {}, blind_4010: null};
  for (const nf of b.faces) part.native_by_type[nf.surface.type] = (part.native_by_type[nf.surface.type]||0)+1;

  // (A) join and (B) geometric fit to the joined surface
  const joinedSurf = new Map();
  for (const f of d.faces) {
    const tag = f.metadata.typeTag, id = f.metadata.rawId;
    part.display_tags[tag] = (part.display_tags[tag]||0)+1;
    const cands = byId.get(id) || [];
    if (!cands.length) { part.unjoined.push({tag, id}); continue; }
    const nf = cands[0];
    const ty = nf.surface.type;
    part.crosstab[tag] = part.crosstab[tag] || {};
    part.crosstab[tag][ty] = (part.crosstab[tag][ty]||0)+1;
    const ds = sampleVerts(f, 150).map(p => safeDist(nf.surface, p));
    part.geom_by_tag[tag] = part.geom_by_tag[tag] || {};
    const g = part.geom_by_tag[tag]; g.all = g.all || []; g.all.push(...ds);
    if (tag === 4010 || tag === 4008 || tag === 4002 || tag === 4003) {
      if (nf.surface.a && (tag===4010||tag===4002||tag===4003)) {
        const base = nf.surface.p || nf.surface.c || [0,0,0];
        part.axis_by_tag[tag] = part.axis_by_tag[tag] || [];
        const dirAxis = f.metadata.direction, nat = nf.surface.a;
        const dot = dirAxis[0]*nat[0]+dirAxis[1]*nat[1]+dirAxis[2]*nat[2];
        part.axis_by_tag[tag].push({dirVsNativeAxisDot: +dot.toFixed(9), axis: axisTest(f, dirAxis, base)});
      }
    }
    joinedSurf.set(f, nf.surface);
  }
  for (const tag of Object.keys(part.geom_by_tag)) {
    part.geom_by_tag[tag] = stats(part.geom_by_tag[tag].all);
  }
  for (const tag of Object.keys(part.axis_by_tag)) {
    const rows = part.axis_by_tag[tag];
    const all = rows.flatMap(r => r.axis);
    part.axis_by_tag[tag] = {faces: rows.length, dirVsNativeAxis_min_abs_dot: Math.min(...rows.map(r=>Math.abs(r.dirVsNativeAxisDot))),
      normal_meridian_max_sin: Math.max(...all), normal_meridian_mean: all.reduce((a,b)=>a+b,0)/all.length, samples: all.length};
  }

  // (C) blind best-fit for the 4010 faces (and 4008): match each display face to native faces by
  // distance, with no ID input. Prefilter on 3 points, confirm the best 3 candidates on 60 points.
  if (doBlind) {
    const want = d.faces.filter(f => [4010, 4008].includes(f.metadata.typeTag));
    const blind = {faces: want.length, same_as_join: 0, best_native_types: {}, best_rms_over_bar: 0, worst: []};
    for (const f of want) {
      const pts = sampleVerts(f, 60), probe = [pts[0], pts[Math.floor(pts.length/2)], pts[pts.length-1]];
      const scored = [];
      for (const nf of b.faces) {
        const pr = probe.map(p => safeDist(nf.surface, p));
        if (pr.some(x => !Number.isFinite(x))) continue;
        scored.push({nf, score: Math.max(...pr)});
      }
      scored.sort((x, y) => x.score - y.score);
      let best = null;
      for (const c of scored.slice(0, 3)) {
        const ds = pts.map(p => safeDist(c.nf.surface, p)).filter(Number.isFinite);
        const mx = ds.length ? Math.max(...ds) : Infinity;
        if (!best || mx < best.max) best = {nf: c.nf, max: mx};
      }
      if (!best) continue;
      const ty = best.nf.surface.type;
      blind.best_native_types[ty] = (blind.best_native_types[ty]||0)+1;
      if (best.nf.id === f.metadata.rawId) blind.same_as_join++;
      if (best.max > BAR) blind.best_rms_over_bar++;
      if (blind.worst.length < 5 && best.max > BAR) blind.worst.push({rawId: f.metadata.rawId, tag: f.metadata.typeTag, bestType: ty, maxDist: best.max});
    }
    part.blind_4010 = blind;
  }
  part.seconds = (Date.now()-t0)/1000;
  part.unjoined = part.unjoined.length ? {count: part.unjoined.length, tags: [...new Set(part.unjoined.map(u=>u.tag))], sample: part.unjoined.slice(0,6)} : {count: 0};
  out.parts[name] = part;
  console.error('done', name, part.seconds);
}
fs.writeFileSync(__dirname + '/results.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 20000));
