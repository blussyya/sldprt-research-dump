// SP-curves on spun and cone surfaces: which (u,v) convention puts the pcurve's ends on the edge's
// vertices. Run against a converter checkout from before the fix (b5b7572^) to see the raw order.
// usage: node spcurveconv.js <part>
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),N=require(D+'brep/native'),G=require(D+'geom/eval');
const M=N.build(I.readBrep(require('fs').readFileSync(process.argv[2])).parsed);
for(const e of M.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;if(c.type!=='spcurve'||!e.v||!/spun|cone/.test(c.surface.type))continue;
  const s=c.surface,P=e.v.map(v=>M.vertices.get(v).p),[a,b]=G.curveRange(c.c2),off=f=>[a,b].map(t=>{const q=G.curvePoint(c.c2,t);return Math.min(...P.map(p=>G.dist(f(q[0],q[1]),p)))*1e3;});
  const y=G.cross(s.a,s.x);
  const ways=s.type==='spun'?{asIs:(u,v)=>G.surfaceEval(s,u,v).p,swapped:(u,v)=>G.surfaceEval(s,v,u).p}
    :{asIs:(u,v)=>G.surfaceEval(s,u,v).p,axial:(u,v)=>{const r=G.add(G.mul(s.x,Math.cos(u)),G.mul(y,Math.sin(u)));return G.add(G.add(s.p,G.mul(r,s.r+v*Math.tan(s.angle))),G.mul(s.a,v));}};
  console.log('edge',e.id,s.type,Object.entries(ways).map(([k,f])=>k+' '+off(f).map(x=>x.toExponential(2)).join('/')+' mm').join(' | '));}
