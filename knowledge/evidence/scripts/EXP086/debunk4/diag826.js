const R=process.argv[2], file=process.argv[3], id=+process.argv[4];
const S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval'), F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(file).parsed);const {dist}=G;
const same=(a,b)=>{if(a.type!==b.type)return false;const st=x=>JSON.stringify(x,(k,v)=>k==='node'||k==='sense'?undefined:v);return st(a)===st(b);};
const e=M.edges.get(id);let c=e.curve;if(c.type==='trimmed')c=c.basis;
const p0=M.vertices.get(e.v[0]).p,p1=M.vertices.get(e.v[1]).p;
const r=F.edgeCurve(e,c,p0,p1,{tolerance:1e-8});const cu=r.curve;
const [A,B]=c.surfaces;const bb=A.type==='blendBound'?A:B,Sx=bb===A?B:A,b=bb.blend;
let i=b.surfaces.indexOf(Sx);if(i<0)i=b.surfaces.findIndex(q=>same(q,Sx));if(i<0)i=bb.boundary-1;
const sp=F.spineOf(b,1e-8).curve,[lo,hi]=G.curveRange(sp);
const foot=t=>G.surfaceFoot(b.surfaces[i],G.curvePoint(sp,t)).q;
console.log('fit',r.error,'ctrl',cu.ctrl.length,'t0,t1',r.t0,r.t1,'spine range',lo,hi);
// locate edge span in spine parameter
const K=20000,devs=[];
const e0=G.curvePoint(cu,r.t0),e1=G.curvePoint(cu,r.t1);
let ia=0,ib=0,da=1e9,db=1e9;const pts=[];
for(let k=0;k<=K;k++){const t=lo+(hi-lo)*k/K,q=foot(t);pts.push(q);const x=dist(q,e0),y=dist(q,e1);if(x<da){da=x;ia=k;}if(y<db){db=y;ib=k;}}
if(ia>ib)[ia,ib]=[ib,ia];
console.log('span samples',ia,ib,'of',K);
for(let k=ia+3;k<=ib-3;k++)devs.push([G.curveProject(cu,pts[k]).d,k]);
devs.sort((a,b)=>b[0]-a[0]);
console.log('top devs',devs.slice(0,6).map(d=>d[0].toExponential(3)+'@'+d[1]).join(' '));
const frac=k=>((k-ia)/(ib-ia)).toFixed(3);console.log('max at span fraction',frac(devs[0][1]),'count>1e-8:',devs.filter(d=>d[0]>1e-8).length,'of',devs.length);
