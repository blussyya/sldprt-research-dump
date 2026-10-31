const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const f="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const {readBrep}=require(R+'/src');const m=require(R+'/src/brep/native').build(readBrep(f).parsed);
let out=null;
for(const fc of (m.faces||[])){const s=fc.surface;if(s&&s.node===3443){let c=s.spine;if(c.type==='trimmed')c=c.basis;out={s:Object.keys(s),ctype:c.type,ckeys:Object.keys(c),surfs:c.surfaces.map(x=>({type:x.type,d:x.d,sense:x.sense,bt:x.basis.type,node:x.basis.node,bk:Object.keys(x.basis)})),n:c.chart.length};
 const data={chart:c.chart,surfs:c.surfaces.map(x=>({d:x.d,sense:x.sense,b:x.basis}))};
 require('fs').writeFileSync('data.json',JSON.stringify(data));break;}}
console.log(JSON.stringify(out));
