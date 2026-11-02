// For every body section: planes parallel to STEP face 173, their offset, and faces using them.
const {execFileSync}=require('child_process');
const N=[0,-0.0872,-0.9962],O=[-25.2,51.296,-70.238];
for(const f of process.argv.slice(2)){
  const j=JSON.parse(execFileSync('node',['bin/sldprt.js','brep',f,'--nodes'],{maxBuffer:1<<30}).toString());
  for(const p of (Array.isArray(j)?j:[j])){
    const by=new Map(p.nodes.map(n=>[n.index,n]));const faces=p.nodes.filter(n=>n.name==='FACE');
    console.log(f.split('/').pop(),'|',p.source,p.kind,'| nodes',p.nodes.length,'faces',faces.length);
    for(const n of p.nodes){if(n.name!=='PLANE')continue;const v=n.values,nn=v.normal,pt=v.pvec;
      const dot=nn[0]*N[0]+nn[1]*N[1]+nn[2]*N[2];if(Math.abs(Math.abs(dot)-1)>1e-3)continue;
      const off=(pt[0]*1000-O[0])*N[0]+(pt[1]*1000-O[1])*N[1]+(pt[2]*1000-O[2])*N[2];if(Math.abs(off)>1)continue;
      const users=faces.filter(F=>F.values.surface===n.index).map(F=>F.index);
      const other=p.nodes.filter(m=>m.name!=='FACE'&&Object.values(m.values).includes(n.index)).map(m=>m.name+':'+m.index).slice(0,4);
      console.log('   plane',n.index,'offset',off.toFixed(4),'mm  faces',JSON.stringify(users),' other refs',other.join(' '));}
  }
}
