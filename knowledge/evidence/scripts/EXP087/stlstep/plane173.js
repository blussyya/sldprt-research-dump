// Find B-rep planes parallel to STEP face 173 and print their offset from it (mm).
const {execFileSync}=require('child_process');
const N=[0,-0.0872,-0.9962],O=[-25.2,51.296,-70.238];
for(const f of process.argv.slice(2)){
  const j=JSON.parse(execFileSync('node',['bin/sldprt.js','brep',f,'--nodes'],{maxBuffer:1<<30}).toString());
  const parts=Array.isArray(j)?j:[j];
  for(const p of parts)for(const n of p.nodes||[]){
    if(n.name!=='PLANE')continue;const v=n.values,nn=v.normal,pt=v.pvec;if(!nn||!pt)continue;
    const dot=nn[0]*N[0]+nn[1]*N[1]+nn[2]*N[2];if(Math.abs(Math.abs(dot)-1)>1e-3)continue;
    const off=(pt[0]*1000-O[0])*N[0]+(pt[1]*1000-O[1])*N[1]+(pt[2]*1000-O[2])*N[2];
    if(Math.abs(off)<1)console.log(f.split('/').pop(),p.source,'plane',n.index,'offset from STEP 173: %s mm',off.toFixed(4));
  }
}
