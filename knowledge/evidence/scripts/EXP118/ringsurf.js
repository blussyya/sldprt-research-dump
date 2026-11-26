// EXP-118: which native surfaces do the vertices of face 75's unlabelled ring lie on? For each ring
// vertex, every analytic native face's surface distance; report the faces within 1e-6 m.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),M=N.build(S.readBrep(buf).parsed);
const H=JSON.parse(fs.readFileSync(process.argv[3])).find(h=>h.fi===+process.argv[4]),pts=H.keys.map(k=>k.split(',').map(Number));
const hits=new Map();let none=0;
for(const p of pts){let any=false;for(const nf of M.faces.values()){let dd;try{dd=Math.abs(G.surfaceDistance(nf.surface,p).d);}catch(e){continue;}
  if(dd<1e-6){any=true;const k=nf.id+' '+nf.surface.type+(nf.surface.r?' r='+(nf.surface.r*1000).toFixed(3)+'mm':'');hits.set(k,(hits.get(k)||0)+1);}}
  if(!any)none++;}
console.log('ring vertices',pts.length,'| on no analytic native surface within 1e-6 m:',none);for(const [k,n] of [...hits].sort((a,b)=>b[1]-a[1]).slice(0,10))console.log('  ',k,n);
