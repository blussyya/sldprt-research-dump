'use strict';
// (a) 4010 faces in a4ecc6f5: how many display directions are the native axis, and per-face normal-meridian max.
// (b) Faces the rawId join cannot classify (unjoined, or the rawId is shared by several native faces):
//     blind 3-point match over ALL native faces, no ID input, then confirm on 60 vertices.
const C = '/home/user/conv-dev/src';
const display = require(C), native = require(C + '/brep/native'), E = require(C + '/geom/eval');
const fs = require('fs');
const files = {a4ecc6f5: '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT',
  '8cd79ff5': '/home/user/sldprt-research-dump/test files online/2019/8cd79ff5_1ESxx.SLDPRT',
  '2f121983': '/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT'};
const report = {};
for (const [name, path] of Object.entries(files)) {
  const d = display.parse(path);
  const b = native.build(require(C + '/index').readBrep(path).parsed);
  const byId = new Map(); for (const nf of b.faces) { if (!byId.has(nf.id)) byId.set(nf.id, []); byId.get(nf.id).push(nf); }
  const ids = d.faces.map(f => f.metadata.rawId);
  const rep = {};
  // (a)
  const spun = d.faces.filter(f => f.metadata.typeTag === 4010);
  let dirPar = 0, dirPerp = 0, dirOther = 0, nmPass = 0, nmFail = 0, nmMaxs = [];
  for (const f of spun) {
    const nf = (byId.get(f.metadata.rawId) || [])[0]; if (!nf || nf.surface.type !== 'spun') continue;
    const a = nf.surface.a, dir = f.metadata.direction, dd = Math.abs(dir[0]*a[0]+dir[1]*a[1]+dir[2]*a[2]);
    if (dd > 0.999) dirPar++; else if (dd < 0.001) dirPerp++; else dirOther++;
    const c = nf.surface.c, n = f.vertexCount, st = Math.max(1, Math.floor(n / 60)); let mx = 0;
    for (let i = 0; i < n; i += st) {
      const p = [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]], nn = [f.normals[i*3], f.normals[i*3+1], f.normals[i*3+2]];
      const q = [p[0]-c[0], p[1]-c[1], p[2]-c[2]], h = q[0]*a[0]+q[1]*a[1]+q[2]*a[2];
      const r = [q[0]-h*a[0], q[1]-h*a[1], q[2]-h*a[2]], rl = Math.hypot(...r); if (rl < 1e-6) continue;
      const t = [a[1]*r[2]-a[2]*r[1], a[2]*r[0]-a[0]*r[2], a[0]*r[1]-a[1]*r[0]], nl = Math.hypot(...nn);
      mx = Math.max(mx, Math.abs(nn[0]*t[0]+nn[1]*t[1]+nn[2]*t[2]) / (nl * Math.hypot(...t)));
    }
    nmMaxs.push(mx); if (mx <= 1e-5) nmPass++; else nmFail++;
  }
  rep.spun_direction_vs_native_axis = {parallel: dirPar, perpendicular: dirPerp, other: dirOther};
  rep.spun_normal_meridian_maxsin_le_1e5 = nmPass; rep.spun_normal_meridian_maxsin_gt_1e5 = nmFail;
  rep.spun_normal_meridian_worst = nmMaxs.sort((x,y)=>y-x).slice(0,3);
  // (b) blind matching for faces the join cannot classify
  const hard = d.faces.filter(f => { const id = f.metadata.rawId; return !byId.has(id) || byId.get(id).length > 1; });
  rep.hard_faces = hard.length;
  rep.hard_blind = [];
  for (const f of hard) {
    const n = f.vertexCount, pts = []; const st = Math.max(1, Math.floor(n / 60));
    for (let i = 0; i < n; i += st) pts.push([f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]]);
    const probe = [pts[0], pts[Math.floor(pts.length/2)], pts[pts.length-1]];
    const sc = [];
    for (const nf of b.faces) {
      let mx = 0, ok = true;
      for (const p of probe) { try { mx = Math.max(mx, Math.abs(E.surfaceDistance(nf.surface, p).d)); } catch (e) { ok = false; break; } }
      if (ok) sc.push({nf, s: mx});
    }
    sc.sort((x,y)=>x.s-y.s);
    let best = null;
    for (const c of sc.slice(0, 4)) {
      let mx = 0; for (const p of pts) { try { mx = Math.max(mx, Math.abs(E.surfaceDistance(c.nf.surface, p).d)); } catch (e) { mx = Infinity; } }
      if (!best || mx < best.mx) best = {nf: c.nf, mx};
    }
    rep.hard_blind.push({rawId: f.metadata.rawId, tag: f.metadata.typeTag, joinedNodes: (byId.get(f.metadata.rawId)||[]).map(x=>x.surface.type),
      blindType: best.nf.surface.type, blindNodeId: best.nf.id, blindMaxDistM: best.mx, sameIdAsRawId: best.nf.id === f.metadata.rawId});
  }
  report[name] = rep;
  console.error('done', name);
}
fs.writeFileSync(__dirname + '/final.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
