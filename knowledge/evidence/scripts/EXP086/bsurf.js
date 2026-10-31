// Fit one blend face of a part on its own and report the spine and surface fit errors.
// node bsurf.js part FACE_ID
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),f=[...M.faces.values()].find(x=>x.id===+process.argv[3]),b=f.surface;
let c=b.spine;if(c.type==='trimmed')c=c.basis;
const desc=s=>s.type+s.node+(s.type==='blend'?'(r '+s.range[0]+' spine '+((s.spine.basis||s.spine).type)+')':'');
console.log('blend',b.node,'supports',b.surfaces.map(desc).join(' '),'spine',c.type,c.surfaces?c.surfaces.map(desc).join(' x '):'');
let t=Date.now();const sp=F.spineOf(b,1e-8);console.log('spine error',sp.error,(Date.now()-t)/1e3+'s');
t=Date.now();const r=F.blendSurface(b,f,M,{tolerance:1e-8});console.log('surface error',r.error,'u ctrl',r.surface.ctrl.length,(Date.now()-t)/1e3+'s');
