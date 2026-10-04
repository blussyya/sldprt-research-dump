'use strict';
/* The display mesh joined to the exact B-rep, face by face and edge by edge.
 *
 * Three ways to join, tried in order for each display face (docs/format/parasolid.md):
 *   'id'        modern files: the face record's rawId is the Parasolid FACE node_id
 *               (1,414 / 1,414 faces, EXP-074);
 *   'edges'     files with an edge table but no face IDs (SolidWorks 2011, pre-2011 chainwheel):
 *               Block1 edge IDs are Parasolid EDGE node_ids, and the set of them on a face picks
 *               out exactly one B-rep face (EXP-078);
 *   'geometry'  no IDs at all (Parasolid-9 era plate4): the B-rep face whose surface carries
 *               the mesh and whose box matches the mesh's.
 *
 *   link(input) -> {faces:[{id, method, mesh, brep}], edges: Map id -> {brep, meshSegments},
 *                   unmatched:{mesh:[indices], brep:[ids]}, model, display}
 * mesh is the display face from parse(); brep is the neutral B-rep face (surface, sameSense,
 * loops); meshSegments are the display strip edges carrying that edge's ID.
 */
const G=require('./geom/eval');

function box(points){const mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
  for(const p of points)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}return {mn,mx};}
function faceBox(F,M){
  const {edgePath}=require('./brep/volume'),pts=[];
  for(const l of F.loops){if(!l.coedges.length&&l.vertex)pts.push(M.vertices.get(l.vertex).p);
    for(const c of l.coedges){const p=edgePath(M.edges.get(c.edge),M.vertices);for(let k=0;k<=16;k++)pts.push(G.curvePoint(p.c,p.t0+(p.t1-p.t0)*k/16));}}
  return pts.length?box(pts):null;
}
const meshPoints=f=>{const out=[];for(let i=0;i<f.vertexCount;i++)out.push([f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);return out;};

function join(display,model){
  const byId=new Map(model.faces.map(F=>[F.id,F]));
  const faceEdges=new Map(model.faces.map(F=>[F.id,new Set(F.loops.flatMap(l=>l.coedges.map(c=>c.edge)))]));
  const used=new Set(),faces=[],pending=[];
  display.faces.forEach((m,i)=>{
    if(m.metadata&&byId.has(m.metadata.rawId)){faces.push({index:i,id:m.metadata.rawId,method:'id'});used.add(m.metadata.rawId);return;}
    const ids=new Set(m.edgeAnnotations.filter(e=>e.id).map(e=>e.id));
    if(ids.size){const c=model.faces.filter(F=>{const fe=faceEdges.get(F.id);return fe.size===ids.size&&[...ids].every(x=>fe.has(x));});
      if(c.length===1&&!used.has(c[0].id)){faces.push({index:i,id:c[0].id,method:'edges'});used.add(c[0].id);return;}}
    pending.push(i);
  });
  // geometry: candidates carry the mesh on their surface; best box match wins, one to one
  if(pending.length){
    const boxes=new Map();const scores=[];
    for(const i of pending){const m=display.faces[i],P=meshPoints(m),mb=box(P);
      for(const F of model.faces){if(used.has(F.id))continue;
        let on=0;for(let k=0;k<P.length;k+=Math.max(1,Math.floor(P.length/64)))on+=Math.abs(G.surfaceDistance(F.surface,P[k]).d)<=1e-6?1:0;
        if(on<Math.min(P.length,64)*0.8)continue;
        if(!boxes.has(F.id))boxes.set(F.id,faceBox(F,model));const fb=boxes.get(F.id);
        // a face with no boundary (a whole sphere or torus) is matched on its surface alone
        const d=fb?Math.max(...[0,1,2].map(k=>Math.max(Math.abs(fb.mn[k]-mb.mn[k]),Math.abs(fb.mx[k]-mb.mx[k])))):0;
        scores.push({i,id:F.id,d});}}
    scores.sort((a,b)=>a.d-b.d);const done=new Set();
    for(const s of scores){if(done.has(s.i)||used.has(s.id))continue;faces.push({index:s.i,id:s.id,method:'geometry',boxDifference:s.d});done.add(s.i);used.add(s.id);}
  }
  faces.sort((a,b)=>a.index-b.index);
  const matched=new Set(faces.map(f=>f.index));
  return {faces,unmatched:{mesh:display.faces.map((_,i)=>i).filter(i=>!matched.has(i)),brep:model.faces.map(F=>F.id).filter(id=>!used.has(id))}};
}

function link(display,model){
  const j=join(display,model),byId=new Map(model.faces.map(F=>[F.id,F]));
  const faces=j.faces.map(f=>({id:f.id,method:f.method,...(f.boxDifference!==undefined?{boxDifference:f.boxDifference}:{}),mesh:display.faces[f.index],brep:byId.get(f.id)}));
  const edges=new Map([...model.edges.values()].map(e=>[e.id,{brep:e,meshSegments:[]}]));
  for(const f of faces)for(const a of f.mesh.edgeAnnotations)if(a.id&&edges.has(a.id))
    edges.get(a.id).meshSegments.push({face:f.id,vertices:a.vertices.map(i=>[f.mesh.vertices[3*i],f.mesh.vertices[3*i+1],f.mesh.vertices[3*i+2]])});
  return {faces,edges,unmatched:j.unmatched,model,display};
}

module.exports={link,join};
