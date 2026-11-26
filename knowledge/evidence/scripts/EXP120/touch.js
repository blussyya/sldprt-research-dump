// EXP-120: 3c4752f1's two plane x blend edges over 1e-8 m. Where along each fitted curve is the
// error, how close is that to an end where the surfaces touch, and how well is the exact curve
// itself determined there (spread of exact points corrected from nearby guesses).
// usage: node touch.js <part> <edge id> [<edge id> ...]
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const [file,...ids]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed),res=P.resolve(M);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>Math.hypot(...a),unit=a=>mul(a,1/norm(a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// foot on a surface; a constant-radius rolling-ball blend is a pipe round its spine (as the fitter does)
const raw=s=>s.type==='blend'&&Math.abs(Math.abs(s.range[0])-Math.abs(s.range[1]))<1e-12;
const foot=(s,p)=>{if(!raw(s))return G.surfaceFoot(s,p);const sp=F.spineOf(s,1e-10).curve,c=G.curvePoint(sp,G.curveProject(sp,p).t),v=sub(p,c),rho=norm(v);return {n:mul(v,1/rho),d:rho-Math.abs(s.range[0])};};
for(const id of ids.map(Number)){const e=M.edges.get(id),r=res.edges.get(id),c=e.curve.type==='trimmed'?e.curve.basis:e.curve;
  // surfaces as the resolve used them (fitted blends replaced)
  const surf=s=>{for(const f of res.faces)if(M.faces.find(x=>x.id===f.id).surface===s)return f.surface;return s;};
  const [S1,S2]=c.surfaces.map(s=>raw(s)?s:surf(s));
  const V=e.v.map(v=>M.vertices.get(v)),len=(()=>{let L=0,p=G.curvePoint(r.curve,r.t0);for(let k=1;k<=400;k++){const q=G.curvePoint(r.curve,r.t0+(r.t1-r.t0)*k/400);L+=norm(sub(q,p));p=q;}return L;})();
  console.log(`edge ${id}: ${S1.type}${S1.node||''} x ${S2.type}${S2.node||''}, length ${(len*1e3).toFixed(4)} mm, fit error ${r.fit.toExponential(2)}, vertex tolerances ${V.map(v=>(v.tolerance||0).toExponential(1)).join(' ')}`);
  // angle between the two surface normals at each end
  for(const [k,v] of V.entries()){const a=foot(S1,v.p),b=foot(S2,v.p);console.log(`  end ${k} (vertex ${e.v[k]}): normals ${(Math.asin(Math.min(1,norm(cross(a.n,b.n))))*180/Math.PI).toExponential(2)} deg apart, vertex off S1 ${Math.abs(a.d).toExponential(1)} off S2 ${Math.abs(b.d).toExponential(1)}`);}
  // dense samples of the fitted curve: distance to the exact curve (corrector in the normal plane)
  const rows=[];const n=2000;
  for(let k=0;k<=n;k++){const t=r.t0+(r.t1-r.t0)*k/n,p=G.curvePoint(r.curve,t),T=unit(G.curveTangent(r.curve,t));
    let X=null;try{X=F.corrector(S1,S2,p,T,new Map());}catch(x){}
    const a=foot(S1,p),b=foot(S2,p),ang=Math.asin(Math.min(1,norm(cross(a.n,b.n))));
    rows.push({s:k/n,toEnd0:norm(sub(p,V[0].p)),toEnd1:norm(sub(p,V[1].p)),d:X?norm(sub(X,p)):NaN,dS:Math.max(Math.abs(a.d),Math.abs(b.d)),ang});}
  const top=[...rows].filter(x=>!isNaN(x.d)).sort((x,y)=>y.d-x.d).slice(0,6);
  console.log(`  dense check: ${rows.filter(x=>x.d>1e-8).length} of ${rows.length} samples over 1e-8 m; ${rows.filter(x=>isNaN(x.d)).length} with no exact point`);
  for(const x of top)console.log(`    s ${x.s.toFixed(4)}: ${x.d.toExponential(2)} m from the exact curve, ${(x.toEnd0*1e6).toFixed(2)} / ${(x.toEnd1*1e6).toFixed(2)} um from the ends, off the surfaces ${x.dS.toExponential(1)}, normals ${(x.ang*180/Math.PI).toExponential(2)} deg apart`);
  // how well the exact point is determined there: correct from guesses moved 1e-9 m sideways
  for(const x of top.slice(0,3)){const t=r.t0+(r.t1-r.t0)*x.s,p=G.curvePoint(r.curve,t),T=unit(G.curveTangent(r.curve,t)),e1=unit(cross(T,[0.3,0.5,0.81])),e2=cross(T,e1);
    const Xs=[];for(const [i,j] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){try{Xs.push(F.corrector(S1,S2,add(p,add(mul(e1,i*1e-7),mul(e2,j*1e-7))),T,new Map()));}catch(z){}}
    let sp=0;for(const A of Xs)for(const B of Xs)sp=Math.max(sp,norm(sub(A,B)));
    console.log(`    s ${x.s.toFixed(4)}: ${Xs.length} exact points from guesses 1e-7 m apart spread over ${sp.toExponential(2)} m`);}
}
