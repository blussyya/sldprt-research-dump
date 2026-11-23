// EXP110 part 5: is u100 a property of the face? usage: node part5.js out_controls.jsonl out_corpus.jsonl
const fs=require('fs');
const rd=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.u92!==undefined&&r.tag!=null);
const C=rd(process.argv[2]),K=rd(process.argv[3]);
const short=f=>f.replace(/.*sldprt-research-dump\//,'');
// 1. same geometry, different files: the 10 mm cube saved as C00 (SW2022), C23 (2011->2022), C24 (2022 native), and the SW2011 C00
const cube=n=>C.filter(r=>short(r.file).includes(n+'/model'));
for(const n of ['SW2022/C00_cube_10mm','SW2022/C23_cube_sw2011_to_2022','SW2022/C24_cube_sw2022_native','SW2011/C00_cube_10mm']){const f=cube(n);console.log(n,'faces',f.length,'u100',f.map(r=>r.u100).join(' '),'rawId',f.map(r=>r.rawId).join(' '));}
// 2. within a file, in record order: are the values address-like (monotone, 8-aligned, small deltas)?
const byFile={};K.concat(C).forEach(r=>(byFile[r.file]=byFile[r.file]||[]).push(r));
let n=0,align8=0,mono=0,pairs=0,eqPairs=0,dups=0;const dd={};
for(const f in byFile){const a=byFile[f].sort((x,y)=>x.i-y.i);const seen=new Set();for(const r of a){n++;if(r.u100%8===0)align8++;if(seen.has(r.u100))dups++;seen.add(r.u100);}
 for(let i=1;i<a.length;i++){pairs++;if(a[i].u100>a[i-1].u100)mono++;if(a[i].u100===a[i-1].u100)eqPairs++;const d=Math.abs(a[i].u100-a[i-1].u100);const k=d<=0x100000?'<=1MiB':d<=0x10000000?'<=256MiB':'larger';dd[k]=(dd[k]||0)+1;}}
console.log('tagged faces',n,'u100 multiple of 8:',align8,'repeat within a file:',dups,' consecutive pairs',pairs,'increasing',mono,'equal',eqPairs,'|delta| classes',dd);
// 3. does u100 follow type/sense/rawId? Within one file, same type+sense planes: distinct values?
let predictable=0,groups=0;const g={};K.forEach(r=>{const k=r.file+'|'+r.type+'|'+r.same;(g[k]=g[k]||new Set()).add(r.u100);});
let single=0,multi=0;for(const k in g){if(g[k].size===1)single++;else multi++;}
console.log('groups (file,type,sense) where all u100 equal:',single,' with several values:',multi);
const sameVals=new Map();K.forEach(r=>{(sameVals.get(r.u100)||sameVals.set(r.u100,new Set()).get(r.u100)).add(r.file)});
let cross=0;for(const [v,s] of sameVals)if(s.size>1)cross++;console.log('u100 values that appear in more than one file:',cross,'of',sameVals.size);
const dupFaces=K.filter(r=>byFile[r.file].filter(x=>x.u100===r.u100).length>1);console.log('faces sharing a u100 with another face of the same file:',dupFaces.length,'files:',[...new Set(dupFaces.map(r=>short(r.file)))].slice(0,6),' their u100==0:',dupFaces.filter(r=>r.u100===0).length);
