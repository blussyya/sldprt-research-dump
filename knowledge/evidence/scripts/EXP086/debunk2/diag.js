const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const {readBrep}=require(R+'/src');const nat=require(R+'/src/brep/native');const {ev,range,dist}=require('./bs.js');
const root="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/sldprt-research-dump/";
const fs=require('fs');const files=fs.readFileSync('files.txt','utf8').trim().split('\n');
for(const [pat,faceId] of [['d799e9a3',936],['073482d3',3231],['0d68d32d',null],['db8a97e2',null],['f0b9a118',null]]){
 const f=files.find(x=>x.includes(pat));const m=nat.build(readBrep(f).parsed);
 const fc=m.faces.find(x=>faceId?x.id===faceId:(x.surface.type==='bspline'&&!x.surface.uPeriodic&&!x.surface.vPeriodic));const S=fc.surface;const r=range(S);
 console.log(pat,'face',fc.id,'deg',S.du,S.dv,'n',S.ctrl.length,S.ctrl[0].length,'rng',JSON.stringify(r),'per',S.uPeriodic,S.vPeriodic,S.uClosed,S.vClosed,'rational',!!S.weights);
 const vs=new Set();for(const l of fc.loops)for(const co of l.coedges){const e=m.edges.get(co.edge);if(e&&e.v)e.v.forEach(v=>vs.add(v));}
 let k=0;for(const id of vs){if(k++>2)break;const P=m.vertices.get(id).p;let best=1e9,bu,bv;const G=300;
  for(let i=0;i<=G;i++)for(let j=0;j<=G;j++){const u=r.u0+(r.u1-r.u0)*i/G,v=r.v0+(r.v1-r.v0)*j/G,d=dist(P,ev(S,u,v,'clamp'));if(d<best){best=d;bu=u;bv=v;}}
  console.log(' vertex',id,'dense-grid min dist (um)',(best*1e6).toFixed(1),'@',bu.toFixed(3),bv.toFixed(3));}
}
