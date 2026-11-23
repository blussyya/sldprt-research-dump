'use strict';
const d=require('./out/survey_all.json');
const plaus=t=>t>9.5e8&&t<1.8e9; // 2000..2027
let tot=0,pl=0,files=0;const byYear={};
for(const r of d){if(!r.nodes||!r.nodes.length)continue;files++;
 const p=r.nodes.filter(n=>plaus(n.t));tot+=r.nodes.length;pl+=p.length;
 const y=r.modern?'modern':'legacy';byYear[y]=byYear[y]||{files:0,nodes:0,plaus:0};byYear[y].files++;byYear[y].nodes+=r.nodes.length;byYear[y].plaus+=p.length;}
console.log(files,tot,pl,byYear);
// legacy example
const l=d.find(r=>r.nodes&&r.nodes.length&&!r.modern);console.log(l.file);for(const n of l.nodes.slice(0,30))console.log(n.id,n.name,n.order,n.cv,n.mv,n.hi.toString(16),n.lo.toString(16),new Date(n.t*1000).toISOString());
