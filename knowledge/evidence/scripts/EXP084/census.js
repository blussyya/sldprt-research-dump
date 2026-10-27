const I=require(require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'index.js');
const fs=require('fs'),path=require('path');const root=process.argv[2];
for(const y of fs.readdirSync(root).filter(d=>/^\d{4}$/.test(d)))for(const f of fs.readdirSync(path.join(root,y))){
  const p=path.join(root,y,f);let o;try{o=I.info(fs.readFileSync(p));}catch(e){console.log([y,f.slice(0,8),'THROW',e.message.slice(0,90)].join('\t'));continue;}
  const b=o.brep,d=o.display;const bf=b?(b.census.FACE||0):'-';
  const st=o.brepError?'nobody: '+o.brepError.slice(0,60):b.error?'brep: '+b.error.slice(0,60):b.graphErrors?'graph '+b.graphErrors:'ok';
  const ds=d.faces?'ok':'nomesh: '+(d.errors||[]).join(';').slice(0,60);
  console.log([y,f.slice(0,8),o.displayListsVersion||'ole',st,ds,'dispF='+d.faces,'brepF='+bf,'rej='+d.rejected].join('\t'));}
