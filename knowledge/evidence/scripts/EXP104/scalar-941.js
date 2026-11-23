'use strict';
/* Reproduce the EXP-097 count on any converter tree: array faces (scalarFlag 1) whose rawId is not the node_id
 * of any FACE node in the body readBody returns. SRC picks the tree: the dump's package copy EXP-097 used, dev, or this branch. */
const fs=require('fs'),path=require('path');
const SRC=process.env.SRC;const S=require(SRC+'/index'),P=require(SRC+'/parasolid/partition');
const {corpusFiles,rel}=require('./common-files');
let files=0,faces=0,noId=0;const per=[];
for(const f of corpusFiles()){
  let d;try{d=S.parse(f);}catch(e){continue;}
  const arr=d.faces.filter(x=>x.metadata&&x.metadata.scalarArrays&&x.metadata.scalarArrays.length===2);if(!arr.length)continue;
  let ids;try{ids=new Set(P.readBody(fs.readFileSync(f),{}).parsed.nodes.filter(n=>n.type===14).map(n=>n.values.node_id));}catch(e){per.push({file:rel(f),error:e.message,arrays:arr.length});continue;}
  files++;let m=0;for(const x of arr){faces++;if(!ids.has(x.metadata.rawId)){noId++;m++;}}
  per.push({file:rel(f),arrays:arr.length,noId:m});
}
const out={src:SRC,files,faces,noId,per};
fs.writeFileSync('scalar-941.'+(process.env.TAG||'x')+'.json',JSON.stringify(out,null,1));
console.log(SRC,'files',files,'array faces',faces,'no same-id FACE',noId);
console.log(per.filter(p=>p.noId||p.error).map(p=>p.file.split('/').pop().slice(0,22)+' '+p.arrays+' noId '+(p.noId??p.error)).join('\n'));
