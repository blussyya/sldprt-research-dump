// Fit one contact edge of a part on its own: the blend it belongs to, that blend's spine error,
// and the edge's fit error. node edge1.js part EDGE_ID
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),e=M.edges.get(+process.argv[3]);let c=e.curve;if(c.type==='trimmed')c=c.basis;
const bb=c.surfaces.find(q=>q.type==='blendBound'),b=bb&&bb.blend;
const desc=s=>s.type+s.node+(s.type==='blend'?'(r '+s.range[0]+')':'');
if(b){let k=b.spine;if(k.type==='trimmed')k=k.basis;console.log('blend',b.node,'r',b.range[0],'supports',b.surfaces.map(desc).join(' '),'spine',k.type,k.surfaces?k.surfaces.map(desc).join(' x '):'','limits',k.start&&k.start.type,k.end&&k.end.type);
  let t=Date.now();const sp=F.spineOf(b,1e-8);console.log('spine error',sp.error.toExponential(2),(Date.now()-t)/1e3+'s');}
const P=v=>M.vertices.get(v).p,t=Date.now(),r=F.edgeCurve(e,c,P(e.v[0]),P(e.v[1]),{tolerance:1e-8});
console.log('edge',e.id,'error',r.error.toExponential(2),(Date.now()-t)/1e3+'s');
// each end vertex: its tolerance and its distance from the exact contact curve (densely searched)
if(b){const strip=x=>JSON.stringify(x,(k,v)=>k==='node'||k==='sense'?undefined:v),Sx=c.surfaces.find(q=>q!==bb);let i=b.surfaces.indexOf(Sx);if(i<0)i=b.surfaces.findIndex(q=>q.type===Sx.type&&strip(q)===strip(Sx));if(i<0)i=bb.boundary-1;const sp=F.spineOf(b,1e-8).curve,[lo,hi]=G.curveRange(sp),cache=new Map();
  const fn=t=>F.contact(b,i,G.curvePoint(sp,t),cache);
  for(const v of e.v){const p=P(v);let best=1e9,bt=lo;for(let k=0;k<=4000;k++){const t=lo+(hi-lo)*k/4000,d=G.dist(fn(t),p);if(d<best){best=d;bt=t;}}
    let a=Math.max(lo,bt-(hi-lo)/4000),z=Math.min(hi,bt+(hi-lo)/4000);for(let k=0;k<200;k++){const m1=a+(z-a)*0.382,m2=a+(z-a)*0.618;if(G.dist(fn(m1),p)<G.dist(fn(m2),p))z=m2;else a=m1;}
    console.log('vertex',v,'tolerance',M.vertices.get(v).tolerance,'off the contact curve',G.dist(fn((a+z)/2),p).toExponential(2),'support index',i);}}
