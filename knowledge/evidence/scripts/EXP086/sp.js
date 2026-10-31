const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed),e=M.edges.get(1655);let c=e.curve;if(c.type==='trimmed')c=c.basis;
const [pl,b]=c.surfaces,sp=F.spineOf(b,1e-9).curve,[lo,hi]=G.curveRange(sp);
for(let k=0;k<=10;k++){const X=G.curvePoint(sp,lo+(hi-lo)*k/10);console.log(X.map(x=>(x*1e3).toFixed(4)).join(','),'plane d',(G.dot(G.sub(X,pl.p),pl.n)*1e3).toFixed(9))}
let best=[0,0];for(let k=0;k<=200000;k++){const t=lo+(hi-lo)*k/200000,X=G.curvePoint(sp,t),d=-G.dot(G.sub(X,pl.p),pl.n);if(d>best[0])best=[d,t];}
console.log('max depth',(best[0]*1e3).toFixed(9),'mm  r',b.range,'gap',((b.range[0]-best[0])*1e6).toFixed(4),'um at',G.curvePoint(sp,best[1]).map(x=>(x*1e3).toFixed(4)).join(','));
for(const v of e.v){const V=M.vertices?M.vertices.get(v):null;console.log('vertex',v,V&&JSON.stringify(V).slice(0,150))}
