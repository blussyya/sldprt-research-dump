'use strict';
const fs=require('fs'),path=require('path'),S=require((process.env.SLDPRT_CONVERTER||require('path').resolve(__dirname,'../../../../../../solidworks-converters'))+'/src');
const root=path.resolve(__dirname,'../../../../../test files online');
function files(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(p,e.name)):/\.sldprt$/i.test(e.name)?[path.join(p,e.name)]:[]);}
const totals={files:0,read:0,faces:0,bytes:0,nonzero:0,rawMismatch:0,values:{},roles:{},filesWithNonzero:[],errors:[]};
const examples=[];
for(const file of files(root)){
 totals.files++;let raw;try{const b=fs.readFileSync(file);raw=S.container.modern.isOLE2(b)?S.container.ole.displayLists(b,S.inflateZlib).bytes:S.container.modern.findDisplayLists(b,S.inflateRaw,S.inflateZlib);if(!raw)throw Error('no DisplayLists');const d=S.display.extractDisplayLists(raw,S.container.modern.isOLE2(b));totals.read++;let nn=0;const buf=Buffer.from(raw);
 for(const [fi,f] of d.faces.entries()){
 totals.faces++;if(f.noEdgeTable)continue;const at=f.offsets.block3;
 if(buf.readUInt32LE(at)!==1||buf.readUInt32LE(at+4)!==8||buf.readUInt32LE(at+8)!==2)throw Error('bad raw header');
 const n=buf.readUInt32LE(at+12);if(n!==f.block1.length)throw Error('count mismatch');
 let control=new Set(),j=0;for(const len of f.block2){control.add(j);j+=len;}
 for(let i=0;i<n;i++){
 const value=buf[at+16+i];totals.bytes++;totals.values[value]=(totals.values[value]||0)+1;if(value!==f.block3[i])totals.rawMismatch++;
 const role=control.has(i)?'control':f.block1[i]===0?'interior':'boundary';const key=role+':'+value;totals.roles[key]=(totals.roles[key]||0)+1;
 if(value){totals.nonzero++;nn++;if(examples.length<40)examples.push({file:path.relative(root,file),face:fi,index:i,value,id:f.block1[i],role});}
 }
 }
 if(nn)totals.filesWithNonzero.push({file:path.relative(root,file),nonzero:nn});
 }catch(e){totals.errors.push({file:path.relative(root,file),error:e.message});}
}
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({totals,examples},null,2));console.log(JSON.stringify(totals,null,2));
