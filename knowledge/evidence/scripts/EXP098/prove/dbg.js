const lib=require('./lib'),fs=require('fs');
const f=process.argv[2],n=process.argv[3];
const {all}=lib.configs(fs.readFileSync(f));
const a=lib.P.assemble(all,n,lib.codec,{});const N=lib.Native.build(a.parsed);const R=lib.Native&&require('/home/user/solidworks-converters/src/brep/procedural').resolve(N,{});
for(const e of R.edges.values()){const c=e.curve;for(const t of [e.t0,e.t1,(e.t0+e.t1)/2]){const p=lib.G.curvePoint(c,t);if(!p.every(Number.isFinite)||Math.abs(p[1])>1)console.log(e.id,c.type,t,p,e.t0,e.t1);}}
for(const e of R.edges.values()){const c=e.curve;if(c.type==='line')continue;for(let i=0;i<=1500;i++){const t=e.t0+(e.t1-e.t0)*i/1500;const p=lib.G.curvePoint(c,t);if(!p.every(Number.isFinite)||Math.abs(p[1])>0.34){console.log('S',e.id,c.type,i,t,p,e.t0,e.t1);break;}}}
const M=require('/home/user/solidworks-converters/src/brep/split').split(R);
for(const e of M.edges.values()){const b=lib.boxOf({vertices:new Map(),edges:new Map([[e.id,e]])});if(!b.max.concat(b.min).every(Number.isFinite)||b.max[1]>0.34){console.log('E',e.id,e.curve.type,JSON.stringify(e.curve).slice(0,300),e.t0,e.t1,b);break;}}
for(const v of M.vertices.values())if(!v.p.every(Number.isFinite)||Math.abs(v.p[1])>.34)console.log('V',v);
