'use strict';
/* Vector state (+104=1,+108=1) against the joined native surface, per tag.
 * cyl: |v.axis| ; cone: |v.axis| vs sin(half angle) ; sphere: v vs (box centre - centre) direction ;
 * all: angle between v and the normalized mean of the stored vertex normals ; v vs axis->box-centre direction.
 * Also the flag checks: +92 vs plane tag, +128 constant. */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
console.log('flag +92: planes with 1',rows.filter(r=>r.tag===4001&&r.w[0]===1).length,'/',rows.filter(r=>r.tag===4001).length,
 '; non-planes with 1',rows.filter(r=>r.tag!==4001&&r.w[0]===1).length,'/',rows.filter(r=>r.tag!==4001).length);
const nat=rows.filter(r=>r.nat);
console.log('flag +92 vs native plane: native planes with 1',nat.filter(r=>r.nat.surf.type==='plane'&&r.w[0]===1).length,'/',nat.filter(r=>r.nat.surf.type==='plane').length,
 '; native non-planes with 1',nat.filter(r=>r.nat.surf.type!=='plane'&&r.w[0]===1).length);
console.log('+128 == 1:',rows.filter(r=>r.w[9]===1).length,'/',rows.length);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const nz=a=>{const l=Math.hypot(...a);return l?a.map(x=>x/l):null;};
const vec=rows.filter(r=>r.w[3]===1&&r.w[4]===1);
const by={};for(const r of vec)(by[r.file]=by[r.file]||[]).push(r);
const st={};const add=(k,f)=>{(st[k]=st[k]||[]).push(f);};
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join('/home/user/sldprt-research-dump',file));
  for(const r of rs){
    const f=d.faces[r.idx],v=r.fl.slice(6,9),N=f.normals;let m=[0,0,0];
    for(let i=0;i<f.vertexCount;i++)for(let k=0;k<3;k++)m[k]+=N[3*i+k];m=nz(m);
    add(r.tag+' angle(v,meanNormal) deg',Math.acos(Math.min(1,dot(v,m)))*180/Math.PI);
    if(!r.nat)continue;const s=r.nat.surf,c=r.bounds.c;
    if(s.type==='cylinder'){add('cylinder |v.axis|',Math.abs(dot(v,s.a)));
      const q=sub(c,s.p),h=dot(q,s.a),rad=nz(sub(q,s.a.map(x=>x*h)));if(rad)add('cylinder angle(v,axis->boxcentre) deg',Math.acos(Math.max(-1,Math.min(1,dot(v,rad))))*180/Math.PI);}
    if(s.type==='cone')add('cone |v.axis| - sin(angle)',Math.abs(Math.abs(dot(v,s.a))-Math.abs(Math.sin(s.angle))));
    if(s.type==='cone')add('cone |v.axis|',Math.abs(dot(v,s.a)));
    if(s.type==='sphere'){const q=nz(sub(c,s.c));if(q)add('sphere angle(v,centre->boxcentre) deg',Math.acos(Math.max(-1,Math.min(1,dot(v,q))))*180/Math.PI);}
    if(s.type==='torus')add('torus |v.axis|',Math.abs(dot(v,s.a)));
  }
}
const q=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];};
const summary={};
for(const k of Object.keys(st).sort()){const a=st[k];summary[k]={n:a.length,min:a[0]&&Math.min(...a),median:q(a,.5),p95:q(a,.95),max:Math.max(...a)};console.log(k.padEnd(46),JSON.stringify(summary[k]));}
fs.writeFileSync(__dirname+'/native-check.json',JSON.stringify(summary,null,1));
