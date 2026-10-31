const R=process.argv[2], file=process.argv[3], ids=process.argv[4].split(',').map(Number), which=process.argv[5]||'new';
const S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval');
const F=which==='head'?require(__dirname+'/fit_head.js'):require(R+'/src/brep/fit');
const M=N.build(S.readBrep(file).parsed);
const {add,mul,dot,norm,dist}=G;
const same=(a,b)=>{if(a.type!==b.type)return false;const st=x=>JSON.stringify(x,(k,v)=>k==='node'||k==='sense'?undefined:v);return st(a)===st(b);};
function nearest(S1,S2,v){let X=v;
  for(let it=0;it<10;it++){const a=G.surfaceDistance(S1,X),b=G.surfaceDistance(S2,X);if(!a.n||!b.n)return null;
    const JJ=[[dot(a.n,a.n),dot(a.n,b.n)],[dot(a.n,b.n),dot(b.n,b.n)]],det=JJ[0][0]*JJ[1][1]-JJ[0][1]*JJ[1][0];
    const l=[(a.d*JJ[1][1]-b.d*JJ[0][1])/det,(JJ[0][0]*b.d-JJ[1][0]*a.d)/det];
    const D=add(mul(a.n,-l[0]),mul(b.n,-l[1]));X=add(X,D);if(norm(D)<1e-14)break;}
  return X;}
for(const id of ids){
  const e=M.edges.get(id);let c=e.curve;if(c.type==='trimmed')c=c.basis;
  const p0=M.vertices.get(e.v[0]).p,p1=M.vertices.get(e.v[1]).p,vt=e.v.map(v=>M.vertices.get(v).tolerance);
  const t0=Date.now();let r;
  try{r=F.edgeCurve(e,c,p0,p1,{tolerance:1e-8});}catch(x){console.log(JSON.stringify({edge:id,err:x.message}));continue;}
  const cu=r.curve,ga=dist(G.curvePoint(cu,r.t0),p0),gb=dist(G.curvePoint(cu,r.t1),p1);
  const [A,B]=c.surfaces;const bb=A.type==='blendBound'?A:B.type==='blendBound'?B:null;
  let dev=0,n=400;
  if(!bb&&A.type!=='blend'&&B.type!=='blend'){
    for(let k=0;k<=n;k++){const X=G.curvePoint(cu,r.t0+(r.t1-r.t0)*k/n),Y=nearest(A,B,X);if(Y)dev=Math.max(dev,dist(X,Y));}
  }else if(bb){
    const b=bb.blend,Sx=bb===A?B:A;let i=b.surfaces.indexOf(Sx);if(i<0)i=b.surfaces.findIndex(q=>same(q,Sx));if(i<0)i=bb.boundary-1;
    const sp=F.spineOf(b,1e-8).curve,[lo,hi]=G.curveRange(sp),cache=new Map();
    const foot=t=>{const c0=G.curvePoint(sp,t),Sy=b.surfaces[i];
      if(Sy.type==='blend'||(Sy.type==='offset'&&Sy.basis&&Sy.basis.type==='blend'))return F.contact(b,i,c0,cache);return G.surfaceFoot(Sy,c0).q;};
    // exact points -> fitted curve, in the range between fitted ends
    const ends=[G.curvePoint(cu,r.t0),G.curvePoint(cu,r.t1)];
    const K=3000;const ts=[];for(let k=0;k<=K;k++)ts.push(lo+(hi-lo)*k/K);
    const pts=ts.map(foot);
    // keep samples between the two ends (by nearest-sample index to each end)
    const ni=q=>{let bi=0,bd=Infinity;pts.forEach((x,j)=>{const d=dist(x,q);if(d<bd){bd=d;bi=j;}});return bi;};
    let ia=ni(ends[0]),ib=ni(ends[1]);if(ia>ib)[ia,ib]=[ib,ia];
    const [ca,cb]=G.curveRange(cu);
    for(let j=ia+2;j<=ib-2;j++){dev=Math.max(dev,G.curveProject(cu,pts[j]).d);}
    // plus the exact curve points beside each end, which need a finer look
    var ni_=[ia,ib];
  }
  console.log(JSON.stringify({edge:id,which,fitErr:r.error,devOwn:dev,gap:[ga,gb],vtol:vt,secs:(Date.now()-t0)/1000}));
}
