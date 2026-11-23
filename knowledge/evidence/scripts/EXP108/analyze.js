'use strict';
// EXP108 analysis of out/edges.jsonl: display type number vs native curve, face pair, dihedral class.
const fs=require('fs');
const L=fs.readFileSync(__dirname+'/out/edges.jsonl','utf8').trim().split('\n').map(JSON.parse);
const famOf=t=>t<4000?'300x':'480xx';
const cls=r=>{const d=r.dihedral;if(!d)return 'nodih';if(d.dist>1e-6)return 'offsurf';const a=Math.abs(d.ang);if(Math.abs(d.dn)>1-1e-9)return 'smooth';return d.s<0?'convex':'concave';};
const tab=(rows,keyf)=>{const m={};for(const r of rows){const k=keyf(r);m[k]=(m[k]||0)+1;}return m;};
const pr=(t,m)=>{console.log('## '+t);for(const k of Object.keys(m).sort())console.log('  '+k+': '+m[k]);};
// one tag per side; sides with a single tag
const rows=[];
for(const r of L){r.sides.forEach((s,i)=>{if(s.tags&&s.tags.length===1&&s.jd==='ok')rows.push({t:s.tags[0],side:i,r,cls:cls(r),other:r.sides[1-i]});});}
console.log('edges',L.length,'side rows',rows.length);
// 1. curve type
pr('300x tag x native curve',tab(rows.filter(x=>famOf(x.t)==='300x'),x=>x.t+' '+x.r.curve));
pr('480xx tag x native curve',tab(rows.filter(x=>famOf(x.t)==='480xx'),x=>x.t+' '+x.r.curve));
// 2. 480xx low part vs dihedral class (all curves)
pr('480xx tag x dihedral class',tab(rows.filter(x=>famOf(x.t)==='480xx'),x=>x.t+' '+x.cls));
pr('300x tag x dihedral class',tab(rows.filter(x=>famOf(x.t)==='300x'),x=>x.t+' '+x.cls));
// 3. do the two sides of one edge agree?
const both=L.filter(r=>r.sides.length===2&&r.sides.every(s=>s.tags&&s.tags.length===1&&s.jd==='ok'));
pr('two-sided agreement 480xx',tab(both.filter(r=>famOf(r.sides[0].tags[0])==='480xx'),r=>r.sides[0].tags[0]===r.sides[1].tags[0]?'same':'differ '+[r.sides[0].tags[0],r.sides[1].tags[0]].sort().join('/')));
pr('two-sided agreement 300x',tab(both.filter(r=>famOf(r.sides[0].tags[0])==='300x'),r=>r.sides[0].tags[0]===r.sides[1].tags[0]?'same':'differ '+[r.sides[0].tags[0],r.sides[1].tags[0]].sort().join('/')));
