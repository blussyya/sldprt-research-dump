'use strict';
// EXP108 control: tag vs curve class with the tag paired to a different edge of the same part (rotated by 7 within the part).
const fs=require('fs');
const L=fs.readFileSync(__dirname+'/out/edges.jsonl','utf8').trim().split('\n').map(JSON.parse);
const CL={line:1,circle:2,ellipse:3,intersection:4,bspline:5,spcurve:6};
const clsOf=t=>t<4000?t-3000:Math.round((t-48000)/16);
const byFile={};for(const r of L){const t=r.sides.map(s=>s.tags&&s.tags.length===1?s.tags[0]:null).find(Boolean);if(t)(byFile[r.file]=byFile[r.file]||[]).push({t,c:CL[r.curve]});}
let n=0,ok=0,cn=0,cok=0,nl=0,nlok=0;
for(const rs of Object.values(byFile)){rs.forEach((x,i)=>{n++;if(clsOf(x.t)===x.c)ok++;const y=rs[(i+7)%rs.length];cn++;if(x.c!==1){nl++;if(clsOf(x.t)===y.c)nlok++;}if(clsOf(x.t)===y.c)cok++;});}
console.log({edges:n,classMatch:ok,control_edges:cn,control_match:cok,control_rate:(cok/cn).toFixed(3),nonline_edges:nl,nonline_control_match:nlok,nonline_rate:(nlok/nl).toFixed(3)});
