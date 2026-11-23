'use strict';
/* Test: the vector state's four floats are a normal cone of the display face: v = axis, s = cosine of
 * the largest angle between the axis and a stored vertex normal. Uses the stored normals (float32). */
const fs=require('fs'),path=require('path');
const SRC=process.env.SRC||'/home/user/conv-dev/src';
const S=require(SRC+'/index');
const ROOT='/home/user/sldprt-research-dump/';
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.w[3]===1&&r.w[4]===1);
const byFile={};for(const r of rows)(byFile[r.file]=byFile[r.file]||[]).push(r);
const res=[];
for(const [file,rs] of Object.entries(byFile)){
  const d=S.parse(path.join(ROOT,file));
  for(const r of rs){
    const f=d.faces[r.idx],n=f.normals,s=r.fl[5],v=[r.fl[6],r.fl[7],r.fl[8]];
    let min=2,max=-2,sum=[0,0,0];
    for(let i=0;i<f.vertexCount;i++){const dt=n[3*i]*v[0]+n[3*i+1]*v[1]+n[3*i+2]*v[2];if(dt<min)min=dt;if(dt>max)max=dt;
      sum[0]+=n[3*i];sum[1]+=n[3*i+1];sum[2]+=n[3*i+2];}
    const sl=Math.hypot(...sum),meanDot=sl?(sum[0]*v[0]+sum[1]*v[1]+sum[2]*v[2])/sl:null;
    res.push({file,idx:r.idx,tag:r.tag,s,minDot:min,maxDot:max,meanDot,vc:f.vertexCount});
  }
}
fs.writeFileSync(__dirname+'/cone-test.json',JSON.stringify(res));
const diff=res.map(x=>x.minDot-x.s);
const abs=diff.map(Math.abs).sort((a,b)=>a-b);
const q=p=>abs[Math.floor(p*(abs.length-1))];
console.log('records',res.length);
console.log('|minDot - s| quantiles 50/90/99/max',q(.5),q(.9),q(.99),abs[abs.length-1]);
for(const bar of [1e-6,1e-5,1e-4,1e-3,1e-2])console.log('within',bar,abs.filter(x=>x<=bar).length);
console.log('s <= minDot+1e-6 (cone contains all normals):',res.filter(x=>x.s<=x.minDot+1e-6).length);
const by={};for(const x of res){const o=by[x.tag]=by[x.tag]||{n:0,w1e5:0,w1e3:0,contains:0};o.n++;const a=Math.abs(x.minDot-x.s);if(a<=1e-5)o.w1e5++;if(a<=1e-3)o.w1e3++;if(x.s<=x.minDot+1e-5)o.contains++;}
console.log(by);
console.log('mean normal dot v: min',Math.min(...res.map(x=>x.meanDot)));
