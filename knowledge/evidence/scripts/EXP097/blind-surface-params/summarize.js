'use strict';
// Summary of run_eval.out.json: one line per (file, surface type). Prints to stdout.
const fs=require('fs');
const R=JSON.parse(fs.readFileSync(__dirname+'/run_eval.out.json','utf8')).results;
const f=x=>x==null?'-':(typeof x==='number'?x.toExponential(2):String(x));
const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
const groups={};
for(const x of R){const k=(x.file.replace('test files ','')).replace(/^.*\//,'')+' | '+(x.native||'-')+' | '+x.status;
  groups[k]=groups[k]||{faces:0,verts:0,maxErr:null,p50faces:[],swap:[],shuf:[],null:[],floorMax:null,nonfiniteSwap:0};
  const g=groups[k];g.faces++;g.verts+=x.nv;
  if(x.status==='ok'){g.maxErr=Math.max(g.maxErr??0,x.err.max);g.p50faces.push(x.err.p50);g.swap.push(x.swapErr.p50);g.shuf.push(x.shuffleErr.p50);g.null.push(x.nullErr.p50);g.floorMax=Math.max(g.floorMax??0,x.floorRatio.max);g.nonfiniteSwap+=x.swapErr.nonfinite;}
}
console.log(['group (file | native | status)','faces','verts','maxErr(m)','median-face p50','worst-face p50','swap p50 median','shuffle p50 median','random-null p50 median','floorRatio max'].join(' ; '));
for(const k of Object.keys(groups).sort()){const g=groups[k];
  console.log([k,g.faces,g.verts,f(g.maxErr),f(med(g.p50faces)),f(g.p50faces.length?Math.max(...g.p50faces):null),f(med(g.swap)),f(med(g.shuf)),f(med(g.null)),f(g.floorMax)].join(' ; '));}
