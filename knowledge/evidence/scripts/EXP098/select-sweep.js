#!/usr/bin/env node
'use strict';
/* EXP-098: the display selection rule as the converter now runs it (src/parasolid/select.js).
 * Every part with more than one Config-N-Partition, OLE2 containers included (SW2014 has them). Files with ModelHeaders are the
 * control: Header2 names the active configuration, and the display rule should agree.
 * Writes select-sweep.json. Converter: SLDPRT_CONVERTER, or solidworks-converters beside the dump. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {corpusFiles,relative,ROOT}=require('../EXP091/common');
const CONV=process.env.SLDPRT_CONVERTER||path.resolve(ROOT,'../solidworks-converters');
const P=require(CONV+'/src/parasolid/partition'),S=require(CONV+'/src/parasolid/select');
const M=require(CONV+'/src/container/modern');
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:1<<27}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:1<<27})};
const id=n=>+/Config-(\d+)-Partition$/.exec(n)[1];
const rows=[];
for(const file of corpusFiles()){
  const raw=new Uint8Array(fs.readFileSync(file));
  let all;try{all=P.streams(raw);}catch(_){continue;}
  const parts=Object.keys(all).filter(k=>/(?:^|\/)Config-\d+-Partition$/.test(k)).sort((a,b)=>id(a)-id(b));
  if(parts.length<2)continue;
  const headers=Object.keys(all).some(k=>/Config-\d+-ModelHeader$/.test(k));
  const row={file:relative(file),container:M.isOLE2(raw)?"OLE2":"modern",configurations:parts.length,modelHeaders:headers};
  try{
    const r=P.readBody(raw);row.converter={id:id(r.configuration.name),by:r.configuration.by,matches:(r.configuration.matches||[]).map(id)};
    // the selector on every candidate, ModelHeader files included, so the control can be scored
    const built=parts.map(name=>{try{return {name,...P.assemble(all,name,codec,{})};}catch(e){return {name,parsed:{error:e.message}};}});
    const c=S.choose(raw,built,codec.inflateRaw,codec.inflate);
    row.display={faces:c.displayFaces,reason:c.reason,matches:c.matches.map(id),
      rows:c.rows.map(x=>({id:id(x.name),faces:x.faces,gap:x.gap,error:x.error}))};
    const gaps=c.rows.filter(x=>Number.isFinite(x.gap)&&x.gap>S.BAR).map(x=>x.gap);
    row.nearestRejectedGap=gaps.length?Math.min(...gaps):null;
  }catch(e){row.error=e.message;}
  rows.push(row);console.error(row.file,JSON.stringify(row.converter),JSON.stringify(row.display&&row.display.matches),row.error||'');
}
fs.writeFileSync(path.join(__dirname,'select-sweep.json'),JSON.stringify(rows,null,1)+'\n');
