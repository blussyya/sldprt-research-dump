const R=process.argv[2], file=process.argv[3], only=process.argv[4]?process.argv[4].split(',').map(Number):null;
const S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval'), F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(file).parsed);
const {dist}=G;
const same=(a,b)=>{if(a.type!==b.type)return false;const st=x=>JSON.stringify(x,(k,v)=>k==='node'||k==='sense'?undefined:v);return st(a)===st(b);};
// group contact edges by blend
const groups=new Map();
for(const e of M.edges.values()){
  let c=e.curve; if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||!e.v)continue;
  const [A,B]=c.surfaces;if(A.type!=='blendBound'&&B.type!=='blendBound')continue;
  if(only&&!only.includes(e.id))continue;
  const bb=A.type==='blendBound'?A:B,Sx=bb===A?B:A,b=bb.blend;
  let i=b.surfaces.indexOf(Sx);if(i<0)i=b.surfaces.findIndex(q=>same(q,Sx));if(i<0)i=bb.boundary-1;
  if(!groups.has(b))groups.set(b,[]);groups.get(b).push({e,i});
}
console.error('blends',groups.size);
for(const [b,list] of groups){
  const t0=Date.now();
  let sp;try{sp=F.spineOf(b,1e-8).curve;}catch(x){console.error('spine fail',list.map(l=>l.e.id),x.message);continue;}
  const [lo,hi]=G.curveRange(sp),K=800,r=Math.abs(b.range[0]);
  const cache=new Map();
  const foot=(i,t)=>{const c=G.curvePoint(sp,t),Sx=b.surfaces[i];
    if(Sx.type==='blend'||(Sx.type==='offset'&&Sx.basis&&Sx.basis.type==='blend'))return F.contact(b,i,c,cache);
    return G.surfaceFoot(Sx,c).q;};
  for(const {e,i} of list){
    const row={edge:e.id,blend:b.node||null,support:b.surfaces[i].type,rad:r,v:[]};
    for(const vi of e.v){const V=M.vertices.get(vi);let best=lo,bd=Infinity;
      for(let k=0;k<=K;k++){const t=lo+(hi-lo)*k/K,d=dist(foot(i,t),V.p);if(d<bd){bd=d;best=t;}}
      let a=Math.max(lo,best-(hi-lo)/K),z=Math.min(hi,best+(hi-lo)/K);
      for(let k=0;k<80;k++){const m1=a+(z-a)*0.382,m2=a+(z-a)*0.618;if(dist(foot(i,m1),V.p)<dist(foot(i,m2),V.p))z=m2;else a=m1;}
      const t=(a+z)/2,d=dist(foot(i,t),V.p);
      row.v.push({id:vi,d:Math.min(d,bd),tol:V.tolerance,atEnd:Math.min(t-lo,hi-t)<(hi-lo)*1e-6});}
    console.log(JSON.stringify(row));
  }
  console.error('blend done',(Date.now()-t0)/1000,'s',list.length,'edges');
}
