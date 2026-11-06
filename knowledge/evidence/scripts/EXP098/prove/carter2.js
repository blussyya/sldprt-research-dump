const lib=require('./lib'),fs=require('fs');
const f="/home/user/sldprt-research-dump/test files online/2014/300f9732_Carter2019.SLDPRT";
const raw=fs.readFileSync(f);const {all}=lib.configs(raw);
const a=lib.P.assemble(all,'Config-0-Partition',lib.codec,{});const N=lib.Native.build(a.parsed);const R=require('/home/user/solidworks-converters/src/brep/procedural').resolve(N,{});
const B=lib.boxOf(R);console.log(B.max[2]);
const d=lib.idx.parse(raw);
console.log(d.faces[0].metadata);
for(const fc of R.faces){const E=new Map();for(const l of fc.loops)for(const co of l.coedges)E.set(co.edge,R.edges.get(co.edge));
  const b=lib.boxOf({vertices:new Map(),edges:E});
  if(b.max[2]>B.max[2]-1e-6)console.log(fc.id,fc.surface.type,b.max[2],fc.loops.length,JSON.stringify(fc.surface).slice(0,200));}
console.log('---match');
const fb=R.faces.map(fc=>{const E=new Map();for(const l of fc.loops)for(const co of l.coedges)E.set(co.edge,R.edges.get(co.edge));
  return {id:fc.id,type:fc.surface.type,b:lib.boxOf({vertices:new Map(),edges:E})};});
const used=new Set();
d.faces.forEach((x,i)=>{let best=null,bd=1e9;fb.forEach(g=>{const dd=lib.gap(g.b,x.bounds);if(dd<bd){bd=dd;best=g;}});if(bd>1e-9)console.log(i,'best',best.id,best.type,bd);});
console.log('---circles');
for(const e of R.edges.values()){const c=e.curve;if(c.type==='circle'){const zt=c.c[2]+c.r*Math.sqrt(1-c.n[2]**2);if(zt>B.max[2]-1e-6)console.log(e.id,JSON.stringify(c),e.t0,e.t1,zt);}}
const vs=[...R.vertices.values()].map(v=>v.p[2]).sort((x,y)=>y-x).slice(0,3);console.log(vs);
console.log('display z max values',[...new Set(d.faces.map(x=>x.bounds.max[2]))].sort((x,y)=>y-x).slice(0,6));
console.log('---f1940');
for(const id of [1940,1936,1922]){const fc=R.faces.find(x=>x.id===id);const g=fb.find(x=>x.id===id);const k=[46,48,49].map(i=>d.faces[i]);
 console.log(id,fc.surface.type,JSON.stringify(fc.surface).slice(0,250),'\n box',JSON.stringify(g.b));}
for(const i of [46,48,49]){console.log(i,JSON.stringify(d.faces[i].bounds.min),JSON.stringify(d.faces[i].bounds.max));}
console.log('---tol');
const tl={};for(const e of N.edges.values()){const k=String(e.tolerance);tl[k]=(tl[k]||0)+1;}console.log('edge tol',tl);
const tv={};for(const v of N.vertices.values()){const k=String(v.tolerance);tv[k]=(tv[k]||0)+1;}console.log('vtx tol',tv);
