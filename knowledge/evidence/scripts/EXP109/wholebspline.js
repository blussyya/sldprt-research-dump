'use strict';
// Every native edge in 3c4752f1 with a bspline face on a side: byte on each use and angle, tangent or not.
const path=require('path');const {S,CORPUS}=require('./lib');
const R=require('/home/user/dump-validation/knowledge/evidence/scripts/EXP088/block3-tangent/results.json');
const file='test files online/2022/3c4752f1_A-2226-01_Input_Inline_Tube_Adapter.SLDPRT';
const M=S.brep.model(S.readBrep(path.join(CORPUS,file)).parsed);const ty=new Map(M.faces.map(f=>[f.id,f.surface.type]));
const T={};
for(const r of R.twoSided.filter(r=>r.file===file)){const b=r.faces.some(f=>ty.get(f)==='bspline');const tan=r.maxAngle<0.05;
 const k=`${b?'bspline':'analytic'} ${tan?'tangent':'sharp'} bytes=${r.flags.map(a=>a.join('+')).join('/')}`;T[k]=(T[k]||0)+1;}
console.log(T);
