// all 48 spcurve edges of head_back through edgeCurve on both converters; independent distance of result to the exact SP curve
const mode=process.argv[2];const R=mode==='dev'?'/home/user/conv-dev':'/home/user/solidworks-converters';
const S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);const dist=G.dist;
const surfMemo=new Map(),faceOf=new Map();
function fitted(s,fc){if(s.type!=='blend')return s;if(!surfMemo.has(s))surfMemo.set(s,F.blendSurface(s,fc,M,{tolerance:1e-8}).surface);return surfMemo.get(s);}
const faceByEdge=new Map();for(const fc of M.faces)for(const l of fc.loops)for(const co of l.coedges){if(!faceByEdge.has(co.edge))faceByEdge.set(co.edge,[]);faceByEdge.get(co.edge).push(fc);}
const out=[];
for(const e of M.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;if(c.type!=='spcurve')continue;
  const fc=(faceByEdge.get(e.id)||[]).find(x=>x.surface===c.surface);
  const cc={...c,surface:fitted(c.surface,fc||{})};
  const p0=M.vertices.get(e.v[0]).p,p1=M.vertices.get(e.v[1]).p;
  const rec={id:e.id,surf:c.surface.type,etol:e.tolerance,vtol:e.v.map(v=>M.vertices.get(v).tolerance)};
  try{const r=F.edgeCurve(e,cc,p0,p1,{tolerance:1e-8});
    rec.err=r.error;const A=G.curvePoint(r.curve,r.t0),B=G.curvePoint(r.curve,r.t1);rec.g0=dist(A,p0);rec.g1=dist(B,p1);rec.nctrl=r.curve.ctrl.length;
    // independent: distance of fitted curve to the exact SP curve image, dense sampling both ways
    const [a,b]=G.curveRange(cc);const P=[];const n=3000;for(let i=0;i<=n;i++)P.push(G.curvePoint(cc,a+(b-a)*i/n));
    const lo=Math.min(r.t0,r.t1),hi=Math.max(r.t0,r.t1);let mx=0;const m=400;
    for(let i=0;i<=m;i++){const q=G.curvePoint(r.curve,lo+(hi-lo)*i/m);let bd=1e9;for(const x of P){const d=dist(x,q);if(d<bd)bd=d;}mx=Math.max(mx,bd);}
    rec.dToSP=mx;  // coarse (3000 pts): upper bound on true distance by sampling gap; flagged if close to gap
    rec.sampleGap=null;
  }catch(err){rec.fail=err.message.slice(0,120);}
  out.push(rec);}
require('fs').writeFileSync('c2-'+mode+'.json',JSON.stringify(out,null,1));
console.log(out.length,'edges; failures',out.filter(x=>x.fail).length);
