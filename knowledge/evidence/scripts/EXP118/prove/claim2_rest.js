// Claim 2, "no native edge covers the rest of that circle", measured without chart tolerances.
// The circle edge (1166 / 11124) lies in a plane face (2502 / 12970). The only native edges that came
// within 1e-4 m of the rest of the circle in claim2.js are the blend's contact curves on that plane
// (1152, 1153 / 11090, 11091) and the cylinder-blend intersection (1093 / 11135), all on one rolling-ball
// blend. A point P of the plane lies on the blend (and so on any of those edges) only if P pushed up
// by the ball radius onto the spine's plane lies on the spine's other surface, an offset of a B-surface:
//   g(P) = |distance of Q from the B-surface| - |offset distance|,  Q = P moved onto the spine plane
// (absolute values: the mirrored B-surface has its natural normal turned round).
// g = 0 on the contact curve. Control: g at the native vertices that lie on those edges.
const L=require('./lib'),G=require('./geo'),Geo=require('/home/user/solidworks-converters/src/geom/eval');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const m=native.build(L.S.readBrep(F).parsed);const TAU=2*Math.PI,mod=(x,y)=>((x%y)+y)%y,V=id=>m.vertices.get(id).p;
for(const [circleId,interId,contacts] of [[1166,1093,[1152,1153]],[11124,11135,[11090,11091]]]){
  const ce=m.edges.get(circleId),c=ce.curve,ie=m.edges.get(interId),blend=ie.curve.surfaces.find(s=>s.type==='blend');
  const plane=m.faces.find(f=>f.surface.type==='plane'&&f.loops.some(l=>l.coedges.some(x=>x.edge===circleId))).surface;
  const sp=blend.spine.surfaces,spPlane=sp.find(s=>s.type==='plane'),spOff=sp.find(s=>s.type==='offset');
  const n=G.unit(plane.n);
  // the circle lies in the plane: control on the geometry
  const inPlane=Math.abs(G.dot(G.sub(c.c,plane.p),n)),par=1-Math.abs(G.dot(G.unit(c.n),n));
  const g=P=>{const Q=G.add(P,G.mul(n,G.dot(G.sub(spPlane.p,P),n)));const r=Geo.surfaceDistance(spOff.basis,Q);const nb=r.n;const s=Math.sqrt(Math.max(0,1-G.dot(nb,n)**2));return {g:Math.abs(r.d)-Math.abs(spOff.d),inPlane:Math.abs(Math.abs(r.d)-Math.abs(spOff.d))/s,lift:G.dot(G.sub(spPlane.p,P),n)};};
  console.log('=== circle',circleId,'plane face surface',plane.node,'circle centre off plane',inPlane.toExponential(2),'1-|n.n|',par.toExponential(2),'blend',blend.node,'range',blend.range,'spine: plane',spPlane.node,'offset',spOff.node,'d',spOff.d);
  const ctl=[...new Set([...ce.v,...contacts.flatMap(id=>m.edges.get(id).v)])];
  for(const v of ctl){const r=g(V(v));console.log('  control vertex',v,'on plane',Math.abs(G.dot(G.sub(V(v),plane.p),n)).toExponential(2),'lift to spine plane',r.lift.toExponential(4),'g',r.g.toExponential(2),'in-plane estimate',r.inPlane.toExponential(2));}
  const t0=G.angleOnCircle(V(ce.v[0]),c),t1=G.angleOnCircle(V(ce.v[1]),c),dir=ce.sameSense?1:-1,span=ce.sameSense?mod(t1-t0,TAU):mod(t0-t1,TAU);
  const pt=t=>{const nn=G.unit(c.n),x=G.unit(c.x),y=G.cross(nn,x);return G.add(c.c,G.add(G.mul(x,c.r*Math.cos(t)),G.mul(y,c.r*Math.sin(t))));};
  const rows=[];for(let k=1;k<360;k++){const ang=(TAU-span)*k/360,P=pt(t0+dir*(span+ang));rows.push({deg:ang*180/Math.PI,...g(P)});}
  const ip=rows.map(r=>r.inPlane);const cnt=b=>ip.filter(x=>x<=b).length;
  console.log('  rest of circle:',rows.length,'points (',(360-span*180/Math.PI).toFixed(2),'deg ); in-plane distance to the blend contact curve: min',Math.min(...ip).toExponential(2),'median',ip.slice().sort((a,b)=>a-b)[ip.length>>1].toExponential(2),'max',Math.max(...ip).toExponential(2),'| <=1e-6:',cnt(1e-6),'<=1e-5:',cnt(1e-5),'<=1e-4:',cnt(1e-4));
  const near=rows.filter(r=>r.inPlane<=1e-4);if(near.length)console.log('  points within 1e-4: degrees past the arc end',near.map(r=>r.deg.toFixed(1)+'('+r.inPlane.toExponential(1)+')').join(' '));
  // control inside the arc: points on the circle edge itself are on the plane but generally NOT on the blend
  const ins=[];for(let k=1;k<20;k++){const P=pt(t0+dir*span*k/20);ins.push(g(P).inPlane);}console.log('  (for reference) points inside the arc: in-plane distance to the contact curve min',Math.min(...ins).toExponential(2),'max',Math.max(...ins).toExponential(2));
}
