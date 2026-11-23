const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);const want=new Set([9821,10371,9931,10129,10349]);
const seen=new Map();
for(const fc of M.faces){const s=fc.surface;if(s.type==='blend'&&want.has(s.node)&&!seen.has(s.node))seen.set(s.node,fc.id);}
console.log([...seen]);
function desc(c,d=0){if(!c)return 'null';return c.type+(c.node?'#'+c.node:'')+(c.surfaces?'('+c.surfaces.map(x=>desc(x)).join(' x ')+')':'')+(c.basis?'<'+desc(c.basis)+'>':'');}
for(const fc of M.faces){const s=fc.surface;if(s.type==='blend'&&want.has(s.node)){want.delete(s.node);
 console.log(s.node,'face',fc.id,'spine',desc(s.spine),'range',s.range,'senses',s.senses,'supports',s.surfaces.map(x=>desc(x)).join(' | '),'start',!!s.spine.start,'chart',s.spine.chart&&s.spine.chart.length);}}
