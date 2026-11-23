'use strict';
// Scan 9: for repeated ids, are collisions between bodies of ONE section, or between sections? Plus bbox relation of the display faces.
const S=require('/home/user/solidworks-converters/src');
const nat=require('/home/user/solidworks-converters/src/brep/native');
const J=require('/home/user/solidworks-converters/src/brep/display-join');
for(const f of process.argv.slice(2)){
  const d=S.parse(f);const r=S.readBrep(f);const M=nat.build(r.parsed);
  const secOf=new Map();for(const n of r.parsed.nodes)if(n.values&&n.values.surface!==undefined&&n.values.shell!==undefined)secOf.set(n.values.node_id,n.values.merge_section||0);
  const byId={};for(const nf of M.faces){(byId[nf.displayId]=byId[nf.displayId]||[]).push(nf);}
  let groups=0,sameSecDiffBody=0,diffSec=0,mixed=0,noSec=0;const sections=new Set();
  for(const [k,a] of Object.entries(byId)){if(a.length<2)continue;groups++;
    const secs=a.map(x=>secOf.has(x.id)?secOf.get(x.id):'?');a.forEach((x,i)=>sections.add(secs[i]));
    if(secs.includes('?')){noSec++;continue;}
    const us=new Set(secs);if(us.size===1)sameSecDiffBody++;else if(us.size===a.length)diffSec++;else mixed++;}
  // display: bbox relation within repeated-id groups
  const jr=J.join(d.faces,M);const grp={};d.faces.forEach((df,i)=>{if(df.metadata)(grp[df.metadata.rawId]=grp[df.metadata.rawId]||[]).push(df);});
  let pairs=0,identicalBounds=0,overlap=0,touching=0,sameTag=0,unres=jr.filter((x,i)=>d.faces[i].metadata&&!x.face).length;
  for(const g of Object.values(grp)){if(g.length<2)continue;for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const a=g[i],b=g[j];if(!a.bounds||!b.bounds)continue;pairs++;
    if(a.metadata.typeTag===b.metadata.typeTag)sameTag++;
    const ident=[0,1,2].every(k=>Math.abs(a.bounds.min[k]-b.bounds.min[k])<1e-9&&Math.abs(a.bounds.max[k]-b.bounds.max[k])<1e-9);if(ident)identicalBounds++;
    const gap=[0,1,2].map(k=>Math.max(a.bounds.min[k]-b.bounds.max[k],b.bounds.min[k]-a.bounds.max[k]));const mg=Math.max(...gap);
    if(mg<-1e-9)overlap++;else if(mg<=1e-6)touching++;}}
  console.log(f.split('/').pop().slice(0,30).padEnd(30),'id groups',groups,'| same section, different bodies',sameSecDiffBody,'| all different sections',diffSec,'| mixed',mixed,'| no section info',noSec,'| sections seen',[...sections].join(','),
    '|| display pairs',pairs,'same tag',sameTag,'identical bounds',identicalBounds,'bbox overlap',overlap,'bbox touching(<=1um)',touching,'unresolved faces',unres);
}
