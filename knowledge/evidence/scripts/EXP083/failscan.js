const S=require(require('path').join(__dirname,'../../../../../solidworks-converters/src')),fs=require('fs'),path=require('path');
const dir=process.argv[2];
for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);if(fs.statSync(p).size<20000)continue;let r;try{r=S.info(p);}catch(e){console.log('THROW',f,e.message);continue;}
 if(!r.saved)continue;const d=r.display,b=r.brep;const bad=d.errors.length||d.rejected||!b||b.error||(b&&b.census.FACE!==d.faces);
 if(bad)console.log([r.saved.version,'DL'+(r.displayListsVersion||'leg'),f.slice(0,8),(fs.statSync(p).size/1024|0)+'K','disp:'+(d.errors.join('|')||d.faces+'f'+(d.rejected?' rej'+d.rejected:'')),'brep:'+(r.brepError||(b&&b.error)||(b&&b.census.BODY+'b/'+b.census.FACE+'f'))].join('  '));}
