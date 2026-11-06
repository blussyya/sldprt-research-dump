const fs=require('fs');const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');
const r=require('./survey.json').filter(x=>x.parts&&x.parts.length>1);
for(const x of r){const s=P.streams(fs.readFileSync(x.f));console.log(x.f.split('/').pop(),Object.keys(s).filter(k=>/Config|Header2|Display/.test(k)).map(k=>k+':'+s[k].length).join(' '));}
