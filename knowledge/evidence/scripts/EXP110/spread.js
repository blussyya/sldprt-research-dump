'use strict';
/* Cone files (any face with +104 = 1): for every non-plane face, the normal spread = largest angle between a
 * stored vertex normal and the normalized mean of all stored vertex normals (and the range of the mean's
 * length). Compare faces with a cone (1,1) against faces without (0,0). */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const vecFiles=new Set(rows.filter(r=>r.w[3]).map(r=>r.file));
const by={};for(const r of rows)if(vecFiles.has(r.file)&&r.tag!==4001)(by[r.file]=by[r.file]||[]).push(r);
const out=[];
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join('/home/user/sldprt-research-dump',file));
  for(const r of rs){
    const f=d.faces[r.idx],N=f.normals,n=f.vertexCount;let m=[0,0,0];
    for(let i=0;i<n;i++)for(let k=0;k<3;k++)m[k]+=N[3*i+k];
    const L=Math.hypot(...m);
    let spread=null,cosMin=null;
    if(L>1e-9){m=m.map(x=>x/L);let mn=1;for(let i=0;i<n;i++)mn=Math.min(mn,N[3*i]*m[0]+N[3*i+1]*m[1]+N[3*i+2]*m[2]);cosMin=mn;spread=Math.acos(Math.max(-1,Math.min(1,mn)))*180/Math.PI;}
    out.push({file,idx:r.idx,tag:r.tag,state:r.w[3]+''+r.w[4],spread,meanLen:L/n});
  }
}
fs.writeFileSync(__dirname+'/spread.json',JSON.stringify(out));
for(const st of ['11','00']){
  const xs=out.filter(o=>o.state===st&&o.spread!==null).map(o=>o.spread).sort((a,b)=>a-b);
  const nul=out.filter(o=>o.state===st&&o.spread===null).length;
  console.log('state',st,'faces',xs.length,'(no usable mean:',nul+')','spread deg min/p5/median/p95/max',xs[0].toFixed(2),xs[Math.floor(.05*xs.length)].toFixed(2),xs[xs.length>>1].toFixed(2),xs[Math.floor(.95*xs.length)].toFixed(2),xs[xs.length-1].toFixed(2));
}
for(const bar of [30,40,45,50,60,70,90]){
  const a=out.filter(o=>o.spread!==null&&o.state==='11'&&o.spread>bar).length,b=out.filter(o=>o.spread!==null&&o.state==='00'&&o.spread<=bar).length;
  console.log('bar',bar,'cone faces above bar:',a,' no-cone faces at or below bar:',b);
}
