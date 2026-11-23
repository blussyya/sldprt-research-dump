// Per-candidate brepBox time for 118a3cb0, and a count of display faces with zero vertices in the
// tie-relevant corpus files (meshResidual skips such faces: "if(!n)continue").
const fs=require('fs'),zlib=require('zlib');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const S=require('./variants/select_HEAD.js');
const D=require('/home/user/conv-dev/src/display');
const MAX=128*1024*1024;
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:MAX}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:MAX})};
const f='/home/user/sldprt-research-dump/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT';
const raw=new Uint8Array(fs.readFileSync(f));const all=P.streams(raw,codec);const prim=P.extractPrimary(raw,all,codec,{});
const times=[];
for(const n of prim.candidates){const x=P.assemble(all,n,codec,{});const t0=Date.now();try{const b=S.brepBox({...x,name:n}.parsed);times.push([n.split('/')[1],Date.now()-t0,b.faces]);}catch(e){times.push([n,'ERR '+e.message.slice(0,40)]);}}
console.log(JSON.stringify(times));
const files=['2016/629adcec_cut-z351-d1xl1.SLDPRT','2016/70477058_mt-cut-z085-l1xb1-typ.SLDPRT','2017/516a7dc5_Body1.sldprt','2017/afc71d14_Body2.sldprt','2014/300f9732_Carter2019.SLDPRT','2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT','2016/289756ce_cut-z071-b1-l1-l2-typ.SLDPRT','2024/03afebf4_Profilringe.SLDPRT','2025/c613782b_Крепёжная-Планка.SLDPRT'];
for(const x of files){try{const r=new Uint8Array(fs.readFileSync('/home/user/sldprt-research-dump/test files online/'+x));
  const d=D.parseSLDPRT(r,b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));const z=d.faces.filter(f=>!f.vertices||f.vertices.length===0).length;
  console.log(x.slice(0,28),'faces',d.faces.length,'zeroVertexFaces',z);}catch(e){console.log(x,'ERR',e.message.slice(0,60));}}
const sw=fs.readdirSync('/home/user/sldprt-research-dump/test files new/SW2011').filter(n=>fs.existsSync('/home/user/sldprt-research-dump/test files new/SW2011/'+n+'/model.SLDPRT'));
let zeroSW=0;for(const n of sw){const r=new Uint8Array(fs.readFileSync('/home/user/sldprt-research-dump/test files new/SW2011/'+n+'/model.SLDPRT'));const d=D.parseSLDPRT(r,b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));zeroSW+=d.faces.filter(f=>!f.vertices||!f.vertices.length).length;}
console.log('SW2011 zero-vertex display faces total',zeroSW,'over',sw.length,'parts');
