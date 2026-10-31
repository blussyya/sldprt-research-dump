// head_back blend 6976: correct points along the first chart chord onto offset 6975 ∩ cylinder 6974,
// once with warm starts (shared cache) and once fresh, and print where each lands.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===6976){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;const [S1,S2]=c.surfaces,P=c.chart[0],Q=c.chart[1],T=G.unit(G.sub(Q,P)),warm=new Map();
for(let k=1;k<16;k++){const g=G.add(P,G.mul(G.sub(Q,P),k/16));
  const f=x=>{try{const X=F.corrector(S1,S2,g,T,x);return (G.dist(X,g)*1e3).toFixed(3)+'mm off, along '+(G.dot(G.sub(X,P),T)*1e3).toFixed(3);}catch(e){return e.message.slice(0,50);}};
  console.log(k,'warm',f(warm),'| fresh',f(new Map()));}
// are the chart points on both surfaces? (signed distance to each)
const fo=(s,p)=>{const r=G.surfaceInverse(s,p),e=G.surfaceEval(s,r.u,r.v);return {d:G.dist(p,e.p),u:r.u,v:r.v};};
for(const p of c.chart)console.log('chart pt: to offset',(fo(S1,p).d*1e6).toFixed(3),'um, to cylinder',(fo(S2,p).d*1e6).toFixed(3),'um  uv',fo(S1,p).u.toFixed(4),fo(S1,p).v.toFixed(4));
console.log('base bspline of offset: u range',S1.basis.ku[0],S1.basis.ku[S1.basis.ku.length-1],'v range',S1.basis.kv[0],S1.basis.kv[S1.basis.kv.length-1],'closed',S1.basis.uClosed,S1.basis.vClosed);
for(let k=0;k<=8;k++){const g=G.add(P,G.mul(G.sub(Q,P),k/8)),x=fo(S1,g),y=fo(S2,g);console.log('chord',k,'to offset mm',(x.d*1e3).toFixed(3),'uv',x.u.toFixed(4),x.v.toFixed(4),'to cyl mm',(y.d*1e3).toFixed(3));}
