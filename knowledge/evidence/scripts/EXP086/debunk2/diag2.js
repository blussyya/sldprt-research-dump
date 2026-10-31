const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const {readBrep}=require(R+'/src');const nat=require(R+'/src/brep/native');const {ev,foot,range,dist}=require('./bs.js');
const f=require('fs').readFileSync('files.txt','utf8').trim().split('\n').find(x=>x.includes('f666f342'));
const m=nat.build(readBrep(f).parsed);
let cur=null;(function w(o,seen=new Set()){if(!o||typeof o!=='object'||seen.has(o)||cur)return;seen.add(o);if(o.type==='intersection'&&o.node===5689){cur=o;return;}for(const k of Object.keys(o)){if(k==='ctrl'||k==='chart')continue;w(o[k],seen);}})([...m.faces,...m.edges.values()]);
console.log(cur.surfaces.map(s=>s.type+' '+(s.basis?s.basis.type+s.basis.node:s.node)+' d'+s.d+' '+(s.basis&&s.basis.type)),cur.chart.length);
cur.surfaces.forEach((s,si)=>{let d=0,b=s;while(b.type==='offset'){d+=b.d;b=b.basis;}console.log('surf',si,b.type,b.node,'d',d);
 if(b.type==='bspline'){const r=range(b);console.log(' rng',JSON.stringify(r),'per',b.uPeriodic,b.vPeriodic,'deg',b.du,b.dv,'n',b.ctrl.length,b.ctrl[0].length);
 cur.chart.forEach((P,i)=>{const fc=foot(b,P,'clamp'),ft=foot(b,P,'tan'),fp=foot(b,P,'poly');console.log('  pt',i,'clamp',((fc.d-Math.abs(d))*1e6).toFixed(1),fc.u.toFixed(3),fc.v.toFixed(3),'| poly',((fp.d-Math.abs(d))*1e6).toFixed(1),fp.u.toFixed(3),fp.v.toFixed(3),'| tan',((ft.d-Math.abs(d))*1e6).toFixed(1),ft.u.toFixed(3),ft.v.toFixed(3));});}
 else {cur.chart.forEach((P,i)=>{});}});
