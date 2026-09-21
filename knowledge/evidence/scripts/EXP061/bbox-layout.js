const fs=require('fs'),path=require('path'),zlib=require('zlib');
const v1=require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');
const v2=require('/home/user/sldprt-research-dump/parser/v0.2/src/parser-core.js');
const iR=b=>zlib.inflateRawSync(Buffer.from(b)),iZ=b=>zlib.inflateSync(Buffer.from(b));
const B='/home/user/sldprt-research-dump/test files new/SW2022';
const TOL=1e-9;
let n=0,contains=0,exact=0,ctrOK=0,radOK=0;const byTag={};let worst=0,worstWho='';
for(const d of fs.readdirSync(B).sort()){
 const dir=path.join(B,d); if(!fs.statSync(dir).isDirectory())continue;
 const bb=fs.readFileSync(path.join(dir,'model.SLDPRT'));
 const dl=Buffer.from(v1.findDisplayLists(bb,iR,iZ));
 const r=v2.parseSLDPRT(bb,iR,iZ); if(r.errors&&r.errors.length)continue;
 r.faces.forEach((f,fi)=>{
  n++;
  const v=f.vertices,mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
  for(let k=0;k<v.length;k+=3)for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],v[k+a]);mx[a]=Math.max(mx[a],v[k+a]);}
  const p=dl.subarray(f.geometryEnd,f.geometryEnd+132),g=o=>p.readDoubleLE(o);
  const RMax=[g(36),g(44),g(52)],RMin=[g(60),g(68),g(76)],C=[g(12),g(20),g(28)],R=g(84);
  const tag=f.metadata&&f.metadata.typeTag;
  byTag[tag]=byTag[tag]||{n:0,c:0,e:0};byTag[tag].n++;
  const cont=[0,1,2].every(a=>RMin[a]<=mn[a]+TOL&&RMax[a]>=mx[a]-TOL);
  const ex=[0,1,2].every(a=>Math.abs(RMin[a]-mn[a])<1e-12&&Math.abs(RMax[a]-mx[a])<1e-12);
  if(cont){contains++;byTag[tag].c++;}
  if(ex){exact++;byTag[tag].e++;}
  // centre and radius consistency WITH THE RECORD's own bbox
  const rc=[0,1,2].map(a=>(RMin[a]+RMax[a])/2);
  if([0,1,2].every(a=>Math.abs(C[a]-rc[a])<1e-12))ctrOK++;
  const rr=Math.hypot(...[0,1,2].map(a=>RMax[a]-rc[a]));
  if(Math.abs(R-rr)<1e-12*Math.max(1,rr)||Math.abs(R-rr)<1e-15)radOK++;
  const gap=Math.max(...[0,1,2].map(a=>Math.max(RMin[a]-mn[a],mx[a]-RMax[a])));
  if(gap>worst){worst=gap;worstWho=`${d} face${fi} tag=${tag}`;}
 });
}
console.log(`faces: ${n}`);
console.log(`  record bbox CONTAINS tessellation bbox : ${contains}/${n}`);
console.log(`  record bbox EQUALS   tessellation bbox : ${exact}/${n}`);
console.log(`  +12/20/28 == midpoint of record bbox   : ${ctrOK}/${n}`);
console.log(`  +84 == corner radius of record bbox    : ${radOK}/${n}`);
console.log(`  worst containment violation: ${worst.toExponential(3)} m  (${worstWho})`);
console.log('\n  by surface tag  (n / contains / exactly equals):');
for(const [t,v] of Object.entries(byTag).sort()) console.log(`    ${t}: ${v.n} / ${v.c} / ${v.e}`);
