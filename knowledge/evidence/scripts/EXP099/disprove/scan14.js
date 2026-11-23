'use strict';
// Scan 14: native-only, whole corpus. For each readable B-rep: faces sharing a displayId inside one body (collision), and across bodies.
// Control: parts with several bodies and shared ids must show up (the 9 from scan 7).
const {walk}=require('./lib.js');
const S=require('/home/user/solidworks-converters/src');const nat=require('/home/user/solidworks-converters/src/brep/native');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
let ok=0,fail=0,sameBody=0,crossBody=0,partsCross=0,partsSame=0,faces=0;const same=[];
for(const f of files){
  let M;try{const r=S.readBrep(f);M=nat.build(r.parsed);}catch(e){fail++;continue;}
  ok++;faces+=M.faces.length;const g={};for(const nf of M.faces){const k=nf.displayId!==undefined?nf.displayId:nf.id;(g[k]=g[k]||[]).push(nf.body);}
  let sb=0,cb=0;for(const b of Object.values(g)){if(b.length<2)continue;if(new Set(b).size<b.length)sb++;if(new Set(b).size>1)cb++;}
  sameBody+=sb;crossBody+=cb;if(cb)partsCross++;if(sb){partsSame++;same.push(f.replace(R,''));}
}
console.log('parts read',ok,'failed',fail,'native faces',faces);
console.log('ids shared by faces of different bodies:',crossBody,'in',partsCross,'parts');
console.log('ids repeated inside one body:',sameBody,'in',partsSame,'parts',JSON.stringify(same));
