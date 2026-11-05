'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../../..');
const P=require(path.join(root,'../solidworks-converters/src/parasolid/partition'));
const {extract}=require('../features/export');
function decode(s){return s.replace(/&(?:amp|lt|gt|quot|apos);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[x]));}
const rows=[];
for(const era of ['SW2011','SW2022'])for(const name of fs.readdirSync(path.join(root,'test files new',era))){
 const file=path.join(root,'test files new',era,name,'model.SLDPRT');if(!fs.existsSync(file))continue;
 const streams=P.streams(fs.readFileSync(file)),key=Object.keys(streams).find(k=>/(^|\/)KeyWords$/.test(k));
 const binary=extract(file),xml=key?Buffer.from(streams[key]).toString('utf8'):'';
 const index=new Map();for(const m of xml.matchAll(/<(Feature|Sketch|Extrusion)\b([^>]+)>/g)){
  const id=/\bid="(\d+)"/.exec(m[2]),label=/\bName="([^"]*)"/.exec(m[2]);if(id&&label)index.set(+id[1],decode(label[1]));
 }
 const compared=[],mismatches=[],absent=[];
 for(const feature of binary.features){if(!index.has(feature.id)){absent.push(feature.id);continue;}
  compared.push(feature.id);if(index.get(feature.id)!==feature.name)mismatches.push({id:feature.id,binary:feature.name,xml:index.get(feature.id)});
 }
 rows.push({file:path.relative(root,file),complete:binary.complete,compared:compared.length,mismatches,absentFromXml:absent,xmlEntries:index.size});
}
console.log(JSON.stringify({files:rows.length,compared:rows.reduce((a,r)=>a+r.compared,0),mismatches:rows.reduce((a,r)=>a+r.mismatches.length,0),rows},null,2));
