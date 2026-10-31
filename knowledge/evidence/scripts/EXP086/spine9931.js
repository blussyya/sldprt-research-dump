// head_back blend 9931: where along its spine is the 2.4e-7 m fit error? Correct points of the
// fitted spine back onto blend 9930 ∩ offset 9925 and print how far each moves. Also the spine
// fit errors of the blends this one is built on.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),f=[...M.faces.values()].find(x=>x.id===9865),b=f.surface;
let c=b.spine;if(c.type==='trimmed')c=c.basis;const [S1,S2]=c.surfaces;
const sp=F.spineOf(b,1e-8).curve,[a,z]=G.curveRange(sp);
console.log('spine 9930 error',F.spineOf(S1,1e-10).error,'support blend 8429 spine error',F.spineOf(b.surfaces[1],1e-10).error);
const cache=new Map();let worst=0,wt=0;
for(let k=0;k<=400;k++){const t=a+(z-a)*k/400,p=G.curvePoint(sp,t),T=G.unit(G.curveTangent(sp,t));
  try{const X=F.corrector(S1,S2,p,T,cache),d=G.dist(X,p);if(d>worst){worst=d;wt=t;}if(k%40===0)console.log('t',t.toFixed(4),'moves',d.toExponential(2));}catch(e){console.log('t',t.toFixed(4),e.message.slice(0,60));}}
console.log('worst',worst.toExponential(2),'at t',wt.toFixed(5),'range',a,z,'chart',c.chart.length,'start',c.start.type,'end',c.end.type);
// near the T end: how far each corrected point moves, the angle between the two surfaces' normals,
// and the corrected point's distance to each surface
const footOn=(s,p)=>{const r=G.surfaceInverse(s,p),e=G.surfaceEval(s,r.u,r.v);return e;};
for(const dt of [1e-1,3e-2,1e-2,3e-3,1e-3,3e-4,1e-4,1e-5,0]){const t=z-dt,p=G.curvePoint(sp,t),T=G.unit(G.curveTangent(sp,t));
  try{const X=F.corrector(S1,S2,p,T,new Map());
    // normals: offset by inverse; the blend pipe normal from its spine
    const k=F.spineOf(S1,1e-10).curve,ck=G.curvePoint(k,G.curveProject(k,X).t),n1=G.unit(G.sub(X,ck));
    const e2=footOn(S2,X),n2=G.unit(G.cross(e2.du,e2.dv));
    const ang=Math.acos(Math.min(1,Math.abs(G.dot(n1,n2))));
    console.log('1-t',dt.toExponential(0),'moves',G.dist(X,p).toExponential(2),'normal angle',ang.toExponential(2),'d1',(G.dist(X,ck)-Math.abs(S1.range[0])).toExponential(1),'d2',G.dist(X,e2.p).toExponential(1)+' vs '+Math.abs(S2.d));}
  catch(e){console.log('1-t',dt,e.message.slice(0,70));}}
console.log('T limit vs curve end',G.dist(c.end.p,G.curvePoint(sp,z)));
// the jumped point: nearest point of the fitted spine to it, and the arc length near the end
{const t=z-1e-5,p=G.curvePoint(sp,t),T=G.unit(G.curveTangent(sp,t)),X=F.corrector(S1,S2,p,T,new Map());
 let best=1e9,bt=0;for(let k=0;k<=200000;k++){const s=a+(z-a)*k/200000,d=G.dist(X,G.curvePoint(sp,s));if(d<best){best=d;bt=s;}}
 console.log('jumped point: nearest on fitted spine',best.toExponential(2),'at 1-t',(z-bt).toExponential(2),'; jump along tangent',G.dot(G.sub(X,p),T).toExponential(2),'across',G.norm(G.sub(G.sub(X,p),G.mul(T,G.dot(G.sub(X,p),T)))).toExponential(2));
 let L=0;for(let k=0;k<1000;k++)L+=G.dist(G.curvePoint(sp,a+(z-a)*k/1000),G.curvePoint(sp,a+(z-a)*(k+1)/1000));console.log('spine length mm',L*1e3,'; 1e-5 of t is about',(L*1e-5*1e9).toFixed(0),'nm');}
