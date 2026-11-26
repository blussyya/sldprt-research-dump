// Claim 2. Native cylinder faces 2516 (display face 75) and 12990 (display face 448; its display ids
// are one higher than the native ids, see id_offset2.js).
// (a) loops of the native face: edge types, vertices.
// (b) own winding number of every loop about the cylinder axis, from own sampling of each coedge's
//     curve between its vertices in the B-rep's direction (circle: angle from v0 to v1 in the edge
//     direction; intersection: the chart polyline from v0 to v1 in the edge direction).
//     Control: the full-circle loop must give +-1; the same loop with one edge's direction flipped
//     must change the answer.
// (c) coverage of the rest of the circle: points on the circle edge's circle outside its arc, tested
//     against every native edge's own extent. Control: points inside the arc must be covered.
// (d) display labels: angles of the display segments labelled with the circle edge, inside the B-rep
//     arc or not; display points labelled with the intersection edge against the B-rep branch of the
//     chart and the other branch. Winding of the display's own labelled cycles.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const TAU=2*Math.PI,mod=(x,y)=>((x%y)+y)%y;
const V=id=>m.vertices.get(id).p;
function circAngle(c,p){return G.angleOnCircle(p,c);}
function circPt(c,t){const n=G.unit(c.n),x=G.unit(c.x),y=G.cross(n,x);return G.add(c.c,G.add(G.mul(x,c.r*Math.cos(t)),G.mul(y,c.r*Math.sin(t))));}
// chart parameter of a point: segment index + fraction of the nearest chart segment
function chartParam(ch,p){let best=Infinity,bi=0,bf=0;for(let i=0;i+1<ch.length;i++){const a=ch[i],b=ch[i+1],ab=G.sub(b,a),L2=G.dot(ab,ab);let t=L2?G.dot(G.sub(p,a),ab)/L2:0;t=Math.max(0,Math.min(1,t));const d=G.norm(G.sub(p,G.add(a,G.mul(ab,t))));if(d<best){best=d;bi=i;bf=t;}}return {s:bi+bf,d:best};}
function chartPoint(ch,s){const i=Math.min(Math.floor(s),ch.length-2),f=s-i;return G.add(ch[i],G.mul(G.sub(ch[i+1],ch[i]),f));}
const closedChart=ch=>G.norm(G.sub(ch[0],ch[ch.length-1]))<1e-12;
// points along an edge from its start to its end vertex (B-rep reading), n samples
function edgeSamples(e,n=200){let c=e.curve;if(c.type==='trimmed')c=c.basis;const out=[];
  if(c.type==='circle'){let t0,t1;if(!e.v){t0=0;t1=TAU;}else{t0=circAngle(c,V(e.v[0]));t1=circAngle(c,V(e.v[1]));}
    let span=e.v?mod(t1-t0,TAU):TAU;if(e.v&&span<1e-12)span=TAU;const dir=e.sameSense?1:-1;if(!e.sameSense&&e.v)span=mod(t0-t1,TAU)||TAU;
    for(let k=0;k<=n;k++)out.push(circPt(c,t0+dir*span*k/n));return {pts:out,span};}
  if(c.type==='line'){const a=V(e.v[0]),b=V(e.v[1]);for(let k=0;k<=n;k++)out.push(G.add(a,G.mul(G.sub(b,a),k/n)));return {pts:out};}
  if(c.type==='intersection'&&!e.v)return {pts:c.chart.slice()};
  if(c.type==='intersection'){const ch=c.chart,N=ch.length-1;const s0=chartParam(ch,V(e.v[0])).s,s1=chartParam(ch,V(e.v[1])).s;
    let len;if(e.sameSense){len=s1-s0;if(len<0&&closedChart(ch))len+=N;}else{len=s1-s0;if(len>0&&closedChart(ch))len-=N;}
    for(let k=0;k<=n;k++){let s=s0+len*k/n;if(closedChart(ch))s=mod(s,N);out.push(chartPoint(ch,Math.max(0,Math.min(N,s))));}return {pts:out,s0,s1,len};}
  return null;}
function winding(loop,axis,flip){ // loop: [{edge,sense}]; flip: edge id whose direction is reversed (control)
  const a=G.unit(axis.a),x=G.unit(axis.x),y=G.cross(a,x);let tot=0,prev=null;const th=p=>{const q=G.sub(p,axis.p);return Math.atan2(G.dot(q,y),G.dot(q,x));};
  for(const co of loop){const e=m.edges.get(co.edge);const ee=flip===co.edge?{...e,sameSense:!e.sameSense}:e;let pts=edgeSamples(ee).pts;if(!co.sense)pts=pts.slice().reverse();
    for(const p of pts){const t=th(p);if(prev!==null){let d=t-prev;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;tot+=d;}prev=t;}}
  return tot/TAU;}
// Each native edge's extent as a dense polyline (memoised) with a bounding box. Circles and lines
// sampled finely (chord sag < 1.2e-7 m for r <= 0.1 m); intersections: the chart between the
// vertices (the true curve is within the chordal error of it); other curve types: the whole curve,
// ignoring the extent (can only over-report coverage).
const Geo=require('/home/user/solidworks-converters/src/geom/eval'),conservative=new Set(),unsupported=new Set(),poly=new Map();let circleCentre=[0,0,0];
function extentPoly(e){if(poly.has(e.id))return poly.get(e.id);let c=e.curve;if(c.type==='trimmed')c=c.basis;let pts=null,tol=0;
  if(c.type==='circle'){const s=edgeSamples(e,Math.max(8,Math.ceil(4000*(e.v?edgeSamples(e,2).span/TAU:1))));pts=s.pts;}
  else if(c.type==='line'){pts=e.v?[V(e.v[0]),V(e.v[1])]:null;}
  else if(c.type==='intersection'){pts=edgeSamples(e,400).pts;tol=c.chordalError;}
  else if(c.type==='spcurve'){conservative.add(e.id);const k=c.c2.knots,a=k[c.c2.degree],b=k[k.length-1-c.c2.degree];pts=[];try{for(let i=0;i<=800;i++)pts.push(Geo.curvePoint(c,a+(b-a)*i/800));}catch(err){unsupported.add(e.id+':spcurve on '+c.surface.type+(e.v?' vertices '+e.v.map(v=>(G.norm(G.sub(V(v),circleCentre))*1000).toFixed(1)).join('/')+' mm from the circle centre':' ring'));pts=null;}}
  else{conservative.add(e.id);try{const [a,b]=Geo.curveRange(c);pts=[];for(let k=0;k<=800;k++)pts.push(Geo.curvePoint(c,a+(b-a)*k/800));}catch(err){unsupported.add(e.id+':'+c.type);}}
  const r=pts?{pts,tol,lo:[0,1,2].map(k=>Math.min(...pts.map(q=>q[k]))),hi:[0,1,2].map(k=>Math.max(...pts.map(q=>q[k])))}:null;poly.set(e.id,r);return r;}
// distance from p to the edge's extent minus the edge's own approximation allowance (chordal error)
function extentDist(e,p){const r=extentPoly(e);if(!r)return Infinity;if([0,1,2].some(k=>p[k]<r.lo[k]-1e-3||p[k]>r.hi[k]+1e-3))return Infinity;return Math.max(0,G.distPolyline(p,r.pts)-r.tol);}
for(const [di,fid,shift] of [[75,2516,0],[448,12990,1]]){
  const face=m.faces.find(f=>f.id===fid),cyl=face.surface;console.log('=== display',di,'native face',fid,cyl.type,'r',cyl.r);
  const circleArc=[],inter=[];
  face.loops.forEach((l,li)=>{const desc=l.coedges.map(co=>{const e=m.edges.get(co.edge),s=edgeSamples(e);return co.edge+(co.sense?'+':'-')+' '+e.curve.type+(e.v?' v'+e.v.join('->'):' ring')+(s&&s.span!==undefined?' arc '+(s.span*180/Math.PI).toFixed(2)+'deg':'')+(s&&s.len!==undefined?' chart '+s.s0.toFixed(3)+'->'+s.s1.toFixed(3)+' of '+(e.curve.chart.length-1):'');});
    const w=winding(l.coedges,cyl);console.log(' loop',li,desc.join(' ; '),'| winding about axis',w.toFixed(4));
    for(const co of l.coedges){const e=m.edges.get(co.edge);if(e.v&&e.curve.type==='circle')circleArc.push(e);if(e.curve.type==='intersection')inter.push(e);
      if(l.coedges.length>1)console.log('   control: same loop with edge',co.edge,'direction flipped -> winding',winding(l.coedges,cyl,co.edge).toFixed(4));}});
  // (c) rest of the circle
  for(const e of circleArc){const c=e.curve;circleCentre=c.c;poly.clear();conservative.clear();unsupported.clear();const t0=circAngle(c,V(e.v[0])),t1=circAngle(c,V(e.v[1]));const span=e.sameSense?mod(t1-t0,TAU):mod(t0-t1,TAU),dir=e.sameSense?1:-1;
    const test=(from,len,n)=>{const res=[];for(let k=1;k<n;k++){const p=circPt(c,from+dir*len*k/n);let best=Infinity,who=null;for(const f of m.edges.values()){const d=extentDist(f,p);if(d<best){best=d;who=f.id;}}res.push({d:best,who});}return res;};
    const rest=test(t0+dir*span,TAU-span,360),inside=test(t0,span,60);
    const cov=(r,b)=>r.filter(x=>x.d<=b).length;
    console.log(' circle edge',e.id,'B-rep arc',(span*180/Math.PI).toFixed(2),'deg; rest of circle: points',rest.length,'within 1e-5 m of any native edge extent',cov(rest,1e-5),'within 1e-4',cov(rest,1e-4),'min dist',Math.min(...rest.map(x=>x.d)).toExponential(2),
      '| control inside arc: points',inside.length,'within 1e-5',cov(inside,1e-5),'nearest edges',[...new Set(inside.map(x=>x.who))].join(','));
    const covered=rest.map((x,k)=>({k,...x})).filter(x=>x.d<=1e-4);const byWho={};for(const x of covered){(byWho[x.who]=byWho[x.who]||[]).push(x);}
    for(const w in byWho){const xs=byWho[w],ed=m.edges.get(+w);console.log('   rest-of-circle points covered within 1e-4 by edge',w,ed.curve.type,'v',ed.v,'faces',m.faces.filter(f=>f.loops.some(l=>l.coedges.some(c=>c.edge===+w))).map(f=>f.id+':'+f.surface.type).join(','),'points',xs.length,'at angle past the arc end (deg)',(xs[0].k*(TAU-span)/360*180/Math.PI).toFixed(2),'..',(xs[xs.length-1].k*(TAU-span)/360*180/Math.PI).toFixed(2),'max d',Math.max(...xs.map(x=>x.d)).toExponential(2));}
    console.log('   edges tested on their whole curve (no extent):',conservative.size,'edges whose curve could not be sampled:',[...unsupported].join(' ')||'none');}
  // (d) display labels
  const f=L.readFace(dl,conv.faces[di].offset),M=L.meshEdges(f);
  const groups={};for(const s of M.boundary){const id=s.ids.find(v=>v);if(id)(groups[id-shift]=groups[id-shift]||[]).push(s);}
  for(const e of circleArc){const c=e.curve,t0=circAngle(c,V(e.v[0])),t1=circAngle(c,V(e.v[1]));const segs=groups[e.id]||[];let inn=0,out=0,mx=0;
    for(const s of segs)for(const p of [L.P(s.a),L.P(s.b),G.mul(G.add(L.P(s.a),L.P(s.b)),0.5)]){const t=circAngle(c,p);const tin=e.sameSense?mod(t-t0,TAU)<=mod(t1-t0,TAU)+1e-6:mod(t0-t,TAU)<=mod(t0-t1,TAU)+1e-6;if(tin)inn++;else out++;}
    // angular extent covered by display labels
    const ang=segs.flatMap(s=>[L.P(s.a),L.P(s.b)]).map(p=>e.sameSense?mod(circAngle(c,p)-t0,TAU):mod(t0-circAngle(c,p),TAU));
    console.log(' display segments labelled',e.id+shift,'(native',e.id+')',segs.length,'points inside the B-rep arc',inn,'outside',out,'| display angular range from v0 along edge (deg)',(Math.min(...ang)*180/Math.PI).toFixed(3),'..',(Math.max(...ang)*180/Math.PI).toFixed(3));}
  for(const e of inter){const segs=groups[e.id]||[],ch=e.curve.chart;const br=edgeSamples(e,400).pts;const other=edgeSamples({...e,sameSense:!e.sameSense},400).pts;
    let dB=0,dO=Infinity,dOmax=0;const pts=segs.flatMap(s=>[L.P(s.a),L.P(s.b)]);
    for(const p of pts){dB=Math.max(dB,G.distPolyline(p,br));const o=G.distPolyline(p,other);dOmax=Math.max(dOmax,o);}
    // interior display points (not the two end vertices) against the other branch
    const ends=e.v.map(V);const inner=pts.filter(p=>ends.every(q=>G.norm(G.sub(p,q))>1e-4));let innerMinOther=Infinity;for(const p of inner)innerMinOther=Math.min(innerMinOther,G.distPolyline(p,other));
    console.log(' display segments labelled',e.id+shift,'(native',e.id+')',segs.length,'max dist to B-rep branch',dB.toExponential(2),'(chordal error',e.curve.chordalError.toExponential(2)+')','| to the other branch: max',dOmax.toExponential(2),'min over points >0.1 mm from the vertices',innerMinOther.toExponential(2));}
  // own walk of the display's labelled cycles and their winding
  const lab=M.boundary.filter(s=>s.ids.some(v=>v));const adj=new Map();for(const s of lab)for(const [a,b] of [[s.a,s.b],[s.b,s.a]]){if(!adj.has(a))adj.set(a,[]);adj.get(a).push({to:b,id:s.ids.find(v=>v)});}
  const seen=new Set();const a=G.unit(cyl.a),x=G.unit(cyl.x),y=G.cross(a,x),th=p=>{const q=G.sub(p,cyl.p);return Math.atan2(G.dot(q,y),G.dot(q,x));};
  for(const s0 of adj.keys()){if(seen.has(s0))continue;let prev=null,cur=s0,tot=0,ids=new Set(),n=0;do{seen.add(cur);const nx=adj.get(cur).find(z=>z.to!==prev)||adj.get(cur)[0];ids.add(nx.id-shift);let d=th(L.P(nx.to))-th(L.P(cur));if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;tot+=d;prev=cur;cur=nx.to;n++;}while(cur!==s0&&n<1e4);
    console.log(' display labelled cycle of',n,'segments, native edges',[...ids].join('/'),'winding about axis',(tot/TAU).toFixed(4));}
  {const un=M.boundary.filter(s=>s.ids.every(v=>!v));const ad=new Map();for(const s of un)for(const [p,q] of [[s.a,s.b],[s.b,s.a]]){if(!ad.has(p))ad.set(p,[]);ad.get(p).push(q);}
   const s0=un[0].a;let prev=null,cur=s0,tot=0,n=0;do{const nx=ad.get(cur).find(z=>z!==prev);let d=th(L.P(nx))-th(L.P(cur));if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;tot+=d;prev=cur;cur=nx;n++;}while(cur!==s0&&n<1e4);
   console.log(' display unlabelled chain of',n,'segments, winding about axis',(tot/TAU).toFixed(4));}
}
