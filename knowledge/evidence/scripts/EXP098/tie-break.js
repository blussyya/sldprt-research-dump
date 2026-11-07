#!/usr/bin/env node
'use strict';
/* EXP-098 tie-breaker check. (1) Six SW2011 cubes that share face count and outer box (fillet,
 * chamfer, 3, 4 and 5 mm holes, moved hole) are offered as candidates against each cube's display
 * in turn, fillet first; each display should pick its own cube. (2) The four tied corpus parts
 * should score equal residuals and keep the lowest ID. Writes tie-break.json. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {ROOT}=require('../EXP091/common');
const CONV=process.env.SLDPRT_CONVERTER||path.resolve(ROOT,'../solidworks-converters');
const P=require(CONV+'/src/parasolid/partition'),S=require(CONV+'/src/parasolid/select');
const iR=b=>zlib.inflateRawSync(b,{maxOutputLength:1<<27}),iZ=b=>zlib.inflateSync(b,{maxOutputLength:1<<27});
const cube=n=>new Uint8Array(fs.readFileSync(path.join(ROOT,'test files new/SW2011',n,'model.SLDPRT')));
const names=['C03_cube_fillet_1mm','C09_cube_chamfer_1mm','C05_cube_hole_3mm','C11_cube_hole_4mm','C04_cube_hole_5mm','C06_cube_hole_moved'];
const cands=names.map(n=>({name:n,parsed:P.readBody(cube(n)).parsed}));
const synthetic=names.map(n=>{const r=S.choose(cube(n),cands,iR,iZ);
  return {display:n,picked:r.name,ok:r.name===n,boxMatches:r.matches,residuals:Object.fromEntries(r.rows.map(x=>[x.name,x.residual]))};});
const corpus=[];
for(const id of ['629adcec','70477058','516a7dc5','afc71d14','118a3cb0','289756ce']){
  const dir=path.join(ROOT,'test files online');let file;
  for(const y of fs.readdirSync(dir).filter(y=>/^\d{4}$/.test(y)))for(const f of fs.readdirSync(path.join(dir,y)))if(f.startsWith(id+'_'))file=path.join(dir,y,f);
  const raw=new Uint8Array(fs.readFileSync(file)),r=P.readBody(raw),all=P.streams(raw);
  const names=Object.keys(all).filter(k=>/Config-\d+-Partition$/.test(k)).sort((a,b)=>+a.match(/(\d+)-P/)[1]-+b.match(/(\d+)-P/)[1]);
  const c=S.choose(raw,names.map(n=>({name:n,...P.assemble(all,n,{inflateRaw:iR,inflate:iZ},{})})),iR,iZ);
  corpus.push({part:id,converter:r.configuration,residuals:c.rows.filter(x=>x.residual!==undefined).map(x=>[x.name.replace(/.*Config-/,''),x.residual])});
}
const out={synthetic,syntheticOk:synthetic.filter(x=>x.ok).length+' of '+synthetic.length,corpus};
fs.writeFileSync(path.join(__dirname,'tie-break.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(out,null,1));
