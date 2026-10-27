const S=require(require('path').join(__dirname,'../../../../../solidworks-converters/src')),fs=require('fs'),path=require('path');
const dir=process.argv[2],by={};
for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);if(fs.statSync(p).size<20000)continue;let r;try{r=S.info(p);}catch(e){continue;}
 if(!r.saved)continue;const k=r.saved.version+' DL'+(r.displayListsVersion||'legacy'),d=r.display,o=by[k]=by[k]||{files:0,faces:0,tris:0,errors:0,rejected:0,brepFail:0,meshFaceMismatch:0};
 o.files++;o.faces+=d.faces;o.tris+=d.triangles;if(d.errors.length)o.errors++;if(d.rejected)o.rejected++;if(!r.brep||r.brep.error)o.brepFail++;else if(r.brep.census.FACE!==d.faces)o.meshFaceMismatch++;}
for(const k of Object.keys(by).sort((a,b)=>parseInt(a)-parseInt(b)))console.log(k.padEnd(18),JSON.stringify(by[k]));
