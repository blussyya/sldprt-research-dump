// Display vertices labelled with the intersection edge (1093 on face 75, 11136 -> native 11135 on
// face 448) against both surfaces of the intersection: the cylinder (closed form) and the rolling-ball
// blend, measured as |distance to the blend's spine| - ball radius. The spine is plane' ∩ offset(B-surface)
// and is found by own Newton steps (on the spine, then along it to the foot). Controls: the native
// vertices of the edge (on both surfaces, expected ~0); the display vertices of the circle edge on the
// same face (on the cylinder ~0, generally not on the blend).
const L=require('./lib'),G=require('./geo'),Geo=require('/home/user/solidworks-converters/src/geom/eval');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);const V=id=>m.vertices.get(id).p;
function spineFoot(P,spPlane,spOff){const n=G.unit(spPlane.n);let C=G.add(P,G.mul(n,G.dot(G.sub(spPlane.p,P),n)));
  for(let it=0;it<200;it++){const r=Geo.surfaceDistance(spOff.basis,C),s=Math.sign(r.d)||1,h=Math.abs(r.d)-Math.abs(spOff.d);
    let gp=G.mul(r.n,s);gp=G.sub(gp,G.mul(n,G.dot(gp,n)));const g2=G.dot(gp,gp);const C1=G.sub(C,G.mul(gp,h/g2));
    const t=G.unit(G.cross(n,gp));const C2=G.add(C1,G.mul(t,G.dot(G.sub(P,C1),t)));const step=G.norm(G.sub(C2,C));C=C2;if(step<1e-16&&Math.abs(h)<1e-15)break;}
  const r=Geo.surfaceDistance(spOff.basis,C);return {C,h:Math.abs(r.d)-Math.abs(spOff.d)};}
for(const [di,eid,cid,shift] of [[75,1093,1166,0],[448,11135,11124,1]]){
  const e=m.edges.get(eid),cyl=e.curve.surfaces.find(s=>s.type==='cylinder'),bl=e.curve.surfaces.find(s=>s.type==='blend');
  const spPlane=bl.spine.surfaces.find(s=>s.type==='plane'),spOff=bl.spine.surfaces.find(s=>s.type==='offset'),R=Math.abs(bl.range[0]);
  const meas=P=>{const f=spineFoot(P,spPlane,spOff);return {cyl:G.distSurface(P,cyl),blend:Math.abs(G.norm(G.sub(P,f.C))-R),spineResidual:Math.abs(f.h)};};
  console.log('=== face',di,'edge',eid,'cylinder',cyl.node,'blend',bl.node,'ball radius',R);
  for(const v of e.v){const r=meas(V(v));console.log('  control native vertex',v,JSON.stringify(Object.fromEntries(Object.entries(r).map(([k,x])=>[k,+x.toExponential(2)]))));}
  const f=L.readFace(dl,conv.faces[di].offset),M=L.meshEdges(f);
  for(const [id,name] of [[eid+shift,'intersection-labelled'],[cid+shift,'circle-labelled (control)']]){const ks=new Set();for(const s of M.boundary)if(s.ids.includes(id)){ks.add(s.a);ks.add(s.b);}
    const rs=[...ks].map(k=>meas(L.P(k)));const mx=k=>Math.max(...rs.map(r=>r[k])).toExponential(2),md=k=>rs.map(r=>r[k]).sort((a,b)=>a-b)[rs.length>>1].toExponential(2);
    const over=rs.map((r,i)=>({i,k:[...ks][i],w:Math.max(r.cyl,r.blend)})).filter(x=>x.w>1e-7);
    const hn=k=>{const p=L.P(k);return Math.min(...e.v.map(v=>G.norm(G.sub(p,V(v)))));};
    if(name.startsWith('inter'))console.log('  intersection-labelled vertices over 1e-7 m on either surface:',over.length,over.map(x=>'worst '+x.w.toExponential(2)+' at '+(hn(x.k)*1e3).toFixed(3)+' mm from the nearest native vertex').join('; '));
    console.log('  display',name,'vertices',rs.length,'cylinder max',mx('cyl'),'median',md('cyl'),'| blend max',mx('blend'),'median',md('blend'),'| spine solve residual max',mx('spineResidual'));}
}
