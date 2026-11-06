// Does a re-save in a newer release explain the missing configuration envelope (EXP-093)?
// For every file at DisplayLists version 13000+ with display faces, list the releases in its
// History stream and compare files with and without the named record.
const fs=require('fs'),path=require('path');
const C=process.env.SLDPRT_CONVERTER||path.resolve(__dirname,'../../../../../../solidworks-converters');
const P=require(C+'/src/parasolid/partition'),H=require(C+'/src/container/history');
const root=path.resolve(__dirname,'../../../../..');
const rows=require('../../EXP093/configuration-presence.json').rows.filter(r=>r.displayListsVersion>=13000&&r.faces);
const out=[];
for(const r of rows){
  let releases=null,error=null;
  try{const s=P.streams(fs.readFileSync(path.join(root,r.file)));const k=Object.keys(s).find(n=>n.endsWith('History'));
    releases=k?H.parseHistory(Buffer.from(s[k])).map(h=>h.version):null;}catch(e){error=e.message}
  out.push({file:r.file,dl:r.displayListsVersion,record:r.configurationRecords>0,localBodies:r.hasLocalBodies,configs:r.configIds.length,releases,error});
}
const group=rec=>{const g=out.filter(x=>x.record===rec&&x.releases);return{files:g.length,
  resaved:g.filter(x=>new Set(x.releases).size>1).length,singleRelease:g.filter(x=>new Set(x.releases).size===1).length,noHistory:out.filter(x=>x.record===rec&&!x.releases).length}};
console.log(JSON.stringify({withRecord:group(true),withoutRecord:group(false),omissions:out.filter(x=>!x.record),
  withRecordLocalBodiesOrMulti:out.filter(x=>x.record&&(x.localBodies||x.configs>1)).map(x=>({file:x.file,releases:x.releases&&[...new Set(x.releases)]}))},null,1));
