'use strict';
const fs=require('fs'),path=require('path'),P=require(path.join(process.env.SLDPRT_CONVERTER||path.resolve(__dirname,'../../../../../../solidworks-converters'),'src/parasolid/partition')),{parse}=require('./biography');
const root=path.resolve(__dirname,'../../../../..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
const rows=[];
for(const f of ['test files new','test files original','test files online'].flatMap(d=>walk(path.join(root,d)))){
 const row={file:path.relative(root,f)};
 try{const s=P.streams(fs.readFileSync(f)),names=Object.keys(s).filter(n=>/(^|\/)Biography$/.test(n));if(names.length!==1){row.status='absent';}else{const b=Buffer.from(s[names[0]]),q=parse(b);row.status='complete';row.bytes=q.bytes;row.records=q.count;row.headers=q.records.map(r=>({words:r.words,servicePack:r.servicePack,locale:r.locale,snapshots:r.snapshots.map(p=>({timeLow:p.timeLow,timeHigh:p.timeHigh,unknown:p.unknown,pathLengths:p.paths.map(x=>x.value.length),pathWords:p.paths.map(x=>x.words)}))}));}}
 catch(e){row.status='failed';row.error=e.message;}
 rows.push(row);
}
console.log(JSON.stringify({counts:rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),rows}));
