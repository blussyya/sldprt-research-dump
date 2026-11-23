'use strict';
// EXP108 step 2: one row per native edge that carries a display type number on at least one face.
// Adds basis curve type, the two face surface types, and the dihedral class computed from outward normals.
const fs=require('fs'),path=require('path');
const CONV=process.env.CONV||'/home/user/conv-dev/src';
const S=require(CONV),P=require(CONV+'/parasolid/partition'),N=require(CONV+'/brep/native'),J=require(CONV+'/brep/display-join'),G=require(CONV+'/geom/eval');
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const only=process.argv[2];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):(/\.sldprt$/i.test(e.name)?[p]:[]);});
const files=['test files new','test files online','test files original'].flatMap(d=>walk(path.join(CORPUS,d)));
const out=fs.createWriteStream(path.join(__dirname,'out',only?'edges.one.jsonl':'edges.jsonl'));
const sub=G.sub,dot=G.dot,cross=G.cross,unit=G.unit;
const base=c=>c.type==='trimmed'?base(c.basis):c.type;
function edgePoint(e,M){
  const c=e.curve,ty=base(c);
  if(['line','circle','ellipse','bspline','spcurve'].includes(ty)){
    try{const r=G.curveRange(c);let t;
      if(ty==='line'){if(c.type==='trimmed'){t=(c.t0+c.t1)/2;}else if(e.v&&e.v[0]!==e.v[1]){const a=M.vertices.get(e.v[0]).p,b=M.vertices.get(e.v[1]).p;const p=a.map((x,k)=>(x+b[k])/2);return {p,t:unit(sub(b,a))};}else return null;}
      else t=(r[0]+r[1])/2;
      const p=G.curvePoint(c,t),tg=G.curveTangent(c,t);
      if(![...p,...tg].every(Number.isFinite))return null;
      return {p,t:unit(tg.map(x=>x*(e.sameSense?1:-1)))};}catch(_){return null;}
  }
  if(e.v&&e.v[0]!==e.v[1]){const a=M.vertices.get(e.v[0]).p,b=M.vertices.get(e.v[1]).p;return {p:a,t:unit(sub(b,a)),chord:true};}
  return null;
}
for(const f of files){
  if(only&&!f.includes(only))continue;
  let d,M;
  try{d=S.parse(f);M=N.build(P.readBody(new Uint8Array(fs.readFileSync(f))).parsed);}catch(e){continue;}
  const df=d.faces.filter(x=>x.metadata);if(!df.length)continue;
  const j=J.join(df,M);const rel=path.relative(CORPUS,f);
  // tag per (native face id, edge displayId)
  const tag=new Map(),joined=new Map();
  df.forEach((x,i)=>{const nf=j[i].face;if(!nf)return;
    if(joined.has(nf.id))joined.set(nf.id,'dup');else joined.set(nf.id,i);
    for(const r of x.metadata.edgeRecords){const k=nf.id+'/'+r.id;if(tag.has(k))tag.set(k,[...tag.get(k),r.typeTag]);else tag.set(k,[r.typeTag]);}});
  const uses=new Map();
  for(const nf of M.faces)for(const l of nf.loops)for(const c of l.coedges){if(!uses.has(c.edge))uses.set(c.edge,[]);uses.get(c.edge).push({nf,sense:c.sense});}
  for(const [eid,us] of uses){
    const e=M.edges.get(eid);if(!e)continue;
    const sides=us.map(u=>({face:u.nf.id,ftype:u.nf.surface.type,tags:tag.get(u.nf.id+'/'+e.displayId)||null,jd:joined.get(u.nf.id)===undefined?null:joined.get(u.nf.id)==='dup'?'dup':'ok'}));
    if(!sides.some(s=>s.tags))continue;
    const rec={file:rel,eid,did:e.displayId,curve:base(e.curve),trimmed:e.curve.type==='trimmed',tolerant:e.tolerant,tol:e.tolerance,closed:!!(e.v&&e.v[0]===e.v[1]),nuse:us.length,sides,dihedral:null};
    if(us.length===2&&us[0].nf!==us[1].nf||(us.length===2)){
      try{
        const ep=edgePoint(e,M);
        if(ep){
          const ns=us.map(u=>{const fo=G.surfaceFoot(u.nf.surface,ep.p);return fo.n.map(x=>x*(u.nf.sameSense?1:-1));});
          const dist=us.map(u=>norm(sub(G.surfaceFoot(u.nf.surface,ep.p).q,ep.p)));
          const T1=ep.t.map(x=>x*(us[0].sense?1:-1));
          const d1=cross(ns[0],T1);                    // direction into face 1, tangent plane
          const s=dot(ns[1],d1),ang=Math.atan2(dot(cross(ns[0],ns[1]),T1),dot(ns[0],ns[1]));
          rec.dihedral={s,ang,dist:Math.max(...dist),chord:!!ep.chord,dn:dot(ns[0],ns[1])};
        }
      }catch(err){rec.dihErr=String(err.message).slice(0,60);}
    }
    out.write(JSON.stringify(rec)+'\n');
  }
}
function norm(a){return Math.hypot(a[0],a[1],a[2]);}
out.end();
