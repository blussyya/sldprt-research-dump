// Claim 1, mesh part. Own strip walk (lib.readFace), own weld by exact float32 coordinates.
// For faces 75 and 448: mesh-boundary edges (used by one triangle), their Block1 ids, the chains
// formed by the unlabelled ones, and whether any other display face in the file uses the same
// segments (exact) or comes near them (distance from segment points to every other face's triangles).
// Controls: (1) a labelled boundary edge shared with a neighbour must be found shared;
// (2) winding of own triangles against the stored normals; (3) removing one interior triangle must
// produce an unlabelled closed chain.
const L=require('./lib');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
// point to triangle distance (Ericson)
function ptTri(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);const d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return norm(ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return norm(bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return norm(sub(p,[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]]));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return norm(cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return norm(sub(p,[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]]));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));const bc=sub(c,b);return norm(sub(p,[b[0]+w*bc[0],b[1]+w*bc[1],b[2]+w*bc[2]]));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return norm(sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]));}
// exact segment index over the whole file: welded segment key -> faces using it as a triangle edge
const segFaces=new Map();
faces.forEach((f,fi)=>{const K=f.pos.map(L.key);for(const t of f.tris)for(let j=0;j<3;j++){const a=K[t[j]],b=K[t[(j+1)%3]];if(a===b)continue;const pk=a<b?a+'|'+b:b+'|'+a;if(!segFaces.has(pk))segFaces.set(pk,new Set());segFaces.get(pk).add(fi);}});
function nearOthers(fi,pts){ // min distance from pts to triangles of every other face (bbox prefilter 1 mm)
  let best=Infinity,who=-1;
  const lo=[0,1,2].map(k=>Math.min(...pts.map(p=>p[k]))-1e-3),hi=[0,1,2].map(k=>Math.max(...pts.map(p=>p[k]))+1e-3);
  faces.forEach((g,gi)=>{if(gi===fi)return;const b=conv.faces[gi].bounds;if(b&&[0,1,2].some(k=>b.min[k]>hi[k]||b.max[k]<lo[k]))return;
    for(const t of g.tris){const [a,b2,c]=t.map(i=>g.pos[i]);for(const p of pts){const d=ptTri(p,a,b2,c);if(d<best){best=d;who=gi;}}}});
  return {best,who};}
function analyse(fi,f,label){
  const M=L.meshEdges(f);
  // winding control: triangle normal vs mean stored vertex normal
  let agree=0,dis=0;for(const t of f.tris){const [a,b,c]=t.map(i=>f.pos[i]);const n=cross(sub(b,a),sub(c,a));if(norm(n)===0)continue;const m=[0,1,2].map(k=>f.nor[t[0]][k]+f.nor[t[1]][k]+f.nor[t[2]][k]);if(dot(n,m)>0)agree++;else dis++;}
  const lab=M.boundary.filter(e=>e.ids.some(x=>x!==0)),unl=M.boundary.filter(e=>e.ids.every(x=>x===0));
  const idsOnBoundary={};for(const e of lab)for(const x of e.ids)if(x)idsOnBoundary[x]=(idsOnBoundary[x]||0)+1;
  // labelled edges that are interior (used twice) -- should be none
  const labInterior=[...M.ids].filter(([pk,ids])=>ids.some(x=>x)&&M.use.get(pk)&&M.use.get(pk).n!==1).length;
  const comps=L.chains(unl);
  const sharedExact=unl.filter(e=>[...segFaces.get(e.pk)].some(g=>g!==fi)).length;
  const labShared=lab.filter(e=>[...segFaces.get(e.pk)].some(g=>g!==fi)).length;
  const r={label,face:fi,tris:f.tris.length,degenerate:M.degenerate,overUsed:M.over.length,windingAgree:agree,windingDisagree:dis,boundary:M.boundary.length,labelled:lab.length,idsOnBoundary,labelledInterior:labInterior,unlabelled:unl.length,unlabelledChains:comps,unlabelledSharedExact:sharedExact,labelledSharedExact:labShared};
  if(fi>=0&&unl.length){const pts=[];for(const e of unl){const a=L.P(e.a),b=L.P(e.b);pts.push(a,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}r.unlabelledNearestOtherFace=nearOthers(fi,pts);
    // control: labelled points must be near a neighbour face
    const lp=[];for(const e of lab){const a=L.P(e.a),b=L.P(e.b);lp.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}
    // worst labelled midpoint distance to the nearest other face (each point separately)
    let worst=0;for(const p of lp){const n=nearOthers(fi,[p]);if(n.best>worst)worst=n.best;}r.labelledWorstNearestOtherFace=worst;}
  return r;}
for(const fi of [75,448])console.log(JSON.stringify(analyse(fi,faces[fi],'face')));
// control 3: drop one triangle whose three edges are all interior (welded edges each used twice)
{const f=faces[75],M=L.meshEdges(f);const idx=f.tris.findIndex(t=>{const K=t.map(i=>M.K[i]);return [0,1,2].every(j=>{const a=K[j],b=K[(j+1)%3];const u=M.use.get(a<b?a+'|'+b:b+'|'+a);return u&&u.n===2;});});
 const g={...f,tris:f.tris.filter((_,i)=>i!==idx)};const r=analyse(-1,g,'control: face 75 minus triangle '+idx);console.log(JSON.stringify({label:r.label,unlabelled:r.unlabelled,unlabelledChains:r.unlabelledChains}));}
// control 4: an ordinary face with every boundary labelled, e.g. face 74 and 76
for(const fi of [74,76])console.log(JSON.stringify((({label,face,boundary,labelled,unlabelled,labelledSharedExact,labelledWorstNearestOtherFace})=>({label,face,boundary,labelled,unlabelled,labelledSharedExact,labelledWorstNearestOtherFace}))(analyse(fi,faces[fi],'control face'))));
