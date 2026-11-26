// EXP-120: how well the exact curve is determined near a touching end. At points of the fitted curve
// d from the end vertex, correct guesses moved 1e-7 m sideways (4 directions) onto the exact curve
// and report how far apart the results land, with the angle between the surface normals there.
// Control: the same at the edge's other end, where the surfaces cross at 32 degrees.
// usage: node determined.js <part> <edge id> <touching end 0|1>
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const [file,idS,endS]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed),res=P.resolve(M),id=+idS;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>Math.hypot(...a),unit=a=>mul(a,1/norm(a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const raw=s=>s.type==='blend'&&Math.abs(Math.abs(s.range[0])-Math.abs(s.range[1]))<1e-12;
const foot=(s,p)=>{if(s.type==='plane'){const d=dot(sub(p,s.p),s.n);return {n:s.n,d};}if(!raw(s))return G.surfaceFoot(s,p);const sp=F.spineOf(s,1e-10).curve,c=G.curvePoint(sp,G.curveProject(sp,p).t),v=sub(p,c),rho=norm(v);return {n:mul(v,1/rho),d:rho-Math.abs(s.range[0])};};
const e=M.edges.get(id),r=res.edges.get(id),c=e.curve.type==='trimmed'?e.curve.basis:e.curve,[S1,S2]=c.surfaces;
const V=e.v.map(v=>M.vertices.get(v).p);
for(const [k,v] of V.entries()){const a=foot(S1,v),b=foot(S2,v);console.log(`vertex ${e.v[k]}: off ${S1.type} ${Math.abs(a.d).toExponential(1)} m, off ${S2.type} ${Math.abs(b.d).toExponential(1)} m`);}
const at=(end,d)=>{// curve parameter at distance d (along the curve) from the given end
  let lo=0,hi=1;const tt=f=>r.t0+(r.t1-r.t0)*(end?1-f:f),P0=G.curvePoint(r.curve,tt(0));for(let i=0;i<60;i++){const m=(lo+hi)/2;if(norm(sub(G.curvePoint(r.curve,tt(m)),P0))<d)lo=m;else hi=m;}return tt(lo);};
for(const end of [+endS,1-endS]){console.log(`${end===+endS?'touching':'control'} end ${end}:`);
  for(const d of [1e-8,3e-8,1e-7,3e-7,1e-6,3e-6,1e-5,1e-4]){const t=at(end,d),p=G.curvePoint(r.curve,t),T=unit(G.curveTangent(r.curve,t)),e1=unit(cross(T,[0.3,0.5,0.81])),e2=cross(T,e1);
    const Xs=[];for(const [i,j] of [[1,0],[-1,0],[0,1],[0,-1]]){try{Xs.push(F.corrector(S1,S2,add(p,add(mul(e1,i*1e-7),mul(e2,j*1e-7))),T,new Map()));}catch(z){}}
    let sp=0,far=0;for(const A of Xs){far=Math.max(far,norm(sub(A,p)));for(const B of Xs)sp=Math.max(sp,norm(sub(A,B)));}
    const a=foot(S1,p),b=foot(S2,p),ang=Math.asin(Math.min(1,norm(cross(a.n,b.n))));
    console.log(`  ${d.toExponential(0)} m from the end: normals ${(ang*180/Math.PI).toExponential(2)} deg apart; ${Xs.length} exact points spread ${sp.toExponential(2)} m, furthest from the fit ${far.toExponential(2)} m`);}}
