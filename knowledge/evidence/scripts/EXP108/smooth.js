'use strict';
// EXP108: does the 480xx variant digit track tangent (smooth) edges? Confusion by dihedral angle.
const fs=require('fs');
const L=fs.readFileSync(__dirname+'/out/edges.jsonl','utf8').trim().split('\n').map(JSON.parse);
const rows=[];
for(const r of L){const t=r.sides.map(s=>s.tags&&s.tags.length===1?s.tags[0]:null).find(x=>x&&x>=48000);if(!t)continue;
  const cl=Math.round((t-48000)/16),k=t-48000-16*cl;rows.push({r,cl,k,a:r.dihedral&&r.dihedral.dist<=1e-6?Math.abs(r.dihedral.ang):null});}
const dialect=rows.filter(x=>x.k===-1),main=rows.filter(x=>x.k>=0);
console.log('dialect -1 files:',[...new Set(dialect.map(x=>x.r.file))].join(' | '),'rows',dialect.length);
console.log('files with k=-1 also holding k>=0 :',[...new Set(dialect.map(x=>x.r.file))].filter(f=>main.some(x=>x.r.file===f)).length);
const two=main.filter(x=>x.r.nuse===2&&x.a!==null);
const bins=[[0,1e-6],[1e-6,1e-3],[1e-3,1e-2],[1e-2,0.05],[0.05,0.5],[0.5,4]];
console.log('angle bin (rad)            k=0    k=1');
for(const [lo,hi] of bins){const s=two.filter(x=>x.a>=lo&&x.a<hi);console.log(`[${lo},${hi})`.padEnd(24),String(s.filter(x=>x.k===0).length).padStart(6),String(s.filter(x=>x.k===1).length).padStart(6));}
console.log('k=1 max angle',Math.max(...two.filter(x=>x.k===1).map(x=>x.a)),'k=0 min angle',Math.min(...two.filter(x=>x.k===0).map(x=>x.a)));
const smoothish=x=>x.a<1e-6;
const tp=two.filter(x=>x.k===1&&smoothish(x)).length,fn=two.filter(x=>x.k===1&&!smoothish(x)).length,fp=two.filter(x=>x.k===0&&smoothish(x)).length,tn=two.filter(x=>x.k===0&&!smoothish(x)).length;
console.log({'k1&angle<1e-6':tp,'k1&angle>=1e-6':fn,'k0&angle<1e-6':fp,'k0&angle>=1e-6':tn});
// k=2 vs use count
const b=main.filter(x=>x.k===2);console.log('k=2 edges',b.length,'with nuse=1',b.filter(x=>x.r.nuse===1).length,' nuse=1 overall in main',main.filter(x=>x.r.nuse===1).length,'of which k=2',main.filter(x=>x.r.nuse===1&&x.k===2).length);
// k=0 candidates with angle<1e-6 : which?
const odd=two.filter(x=>x.k===0&&smoothish(x));const m={};odd.forEach(x=>{const f=x.r.sides.map(s=>s.ftype).sort().join('/')+' '+x.r.curve;m[f]=(m[f]||0)+1;});console.log('k=0 but smooth by angle:',JSON.stringify(m),'files',[...new Set(odd.map(x=>x.r.file.split('/').pop().slice(0,20)))].join(','));
