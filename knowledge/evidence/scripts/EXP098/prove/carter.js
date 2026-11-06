const lib=require('./lib'),fs=require('fs');
const f="/home/user/sldprt-research-dump/test files online/2014/300f9732_Carter2019.SLDPRT";
const raw=fs.readFileSync(f);const {all}=lib.configs(raw);
const d=lib.idx.parse(raw);
const a=lib.P.assemble(all,'Config-0-Partition',lib.codec,{});const N=lib.Native.build(a.parsed);const R=require('/home/user/solidworks-converters/src/brep/procedural').resolve(N,{});
const u=lib.union(d.faces);
const top=d.faces.filter(x=>Math.abs(x.bounds.max[2]-u.max[2])<1e-9);
console.log('display faces at zmax',top.map(x=>[x.id,x.bounds.max[2]]));
// per face brep box from edges of that face
const fe=new Map();
for(const fc of R.faces){const E=new Map();for(const l of fc.loops)for(const co of l.coedges)E.set(co.edge,R.edges.get(co.edge));
  const vs=new Map();for(const e of E.values())if(e.v)for(const v of e.v)vs.set(v,R.vertices.get(v));
  fe.set(fc.id,{b:lib.boxOf({vertices:vs,edges:E}),type:fc.surface.type,nl:fc.loops.length});}
for(const x of top){const g=fe.get(x.id);console.log(x.id,g&&g.type,g&&g.nl,g&&g.b.max[2],x.bounds.max[2],g&&(x.bounds.max[2]-g.b.max[2]));}
// overall max per-face diffs
let n=0;for(const x of d.faces){const g=fe.get(x.id);if(!g){n++;continue;}
 let m=0;for(let k=0;k<3;k++)m=Math.max(m,Math.abs(x.bounds.max[k]-g.b.max[k]),Math.abs(x.bounds.min[k]-g.b.min[k]));
 if(m>1e-8)console.log('face',x.id,g.type,'diff',m);}
console.log('missing',n);
