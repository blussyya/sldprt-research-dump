const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const want=[9821,10371,9931,10129,10349];const fs=require('fs');
for(const id of want){const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);const sp=fs;const s=fc.surface.spine;const c=s.type==='trimmed'?s.basis:s;
 console.log(id,'S1',c.surfaces[0].type,c.surfaces[0].d,c.surfaces[0].sense,c.surfaces[0].basis&&c.surfaces[0].basis.type,'| S2',c.surfaces[1].type,c.surfaces[1].range,c.surfaces[1].d,
  'start',JSON.stringify(c.start&&c.start.p),'end',JSON.stringify(c.end&&c.end.p),'chart',JSON.stringify(c.chart.map(q=>q.map(x=>+x.toFixed(5)))));
 const nb=c.surfaces.find(q=>q.type==='blend');console.log('   nested blend spine',nb.spine.type,nb.spine.surfaces&&nb.spine.surfaces.map(q=>q.type+(q.range?JSON.stringify(q.range):'')).join(' x '));}
