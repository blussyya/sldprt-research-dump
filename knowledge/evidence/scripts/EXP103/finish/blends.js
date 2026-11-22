// EXP-103 (finish): every blend surface's fit error on a part, and every fitted curve over the bar.
// usage: CONV=<converter repo> node blends.js <part>
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const bl=[],ed=[];
const bm=F.blendSurface;F.blendSurface=function(b,f,...a){const t=Date.now(),r=bm.call(this,b,f,...a);bl.push({node:b.node,face:f&&f.id,err:r.error,ms:Date.now()-t});return r;};
const em=F.edgeCurve;F.edgeCurve=function(e,c,...a){const r=em.call(this,e,c,...a);if(r)ed.push({id:e.id,type:c.type,err:r.error});return r;};
const t=Date.now();let res,err=null;try{res=P.resolve(N.build(S.readBrep(process.argv[2]).parsed));}catch(e){err=e.message;}
console.log('resolve',err?'THREW '+err:'ok','time',((Date.now()-t)/1e3).toFixed(1),'s','| blends',bl.length,'curves',ed.length);
bl.sort((a,b)=>b.err-a.err);console.log('worst blends:');for(const b of bl.slice(0,8))console.log('  blend',b.node,'face',b.face,'error',b.err.toExponential(3),'time',b.ms,'ms');
console.log('slowest blends:');for(const b of [...bl].sort((a,b)=>b.ms-a.ms).slice(0,5))console.log('  blend',b.node,'time',b.ms,'ms','error',b.err.toExponential(3));
const over=ed.filter(r=>r.err>1e-8);console.log('curves over 1e-8:',over.length,over.map(r=>r.id+' '+r.type+' '+r.err.toExponential(2)).join(', '));
require('fs').writeFileSync(process.argv[3]||'/dev/null',JSON.stringify({bl,ed}));
