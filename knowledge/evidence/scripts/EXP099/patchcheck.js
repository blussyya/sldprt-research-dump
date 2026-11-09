#!/usr/bin/env node
'use strict';
/* EXP-099 step 12: the proposed guard, tried on a COPY of the converter (not on /home/user/conv-dev).
 * Guard: in metadata(), after reading typeTag, throw when it is outside 4001..4010. Compares the whole corpus
 * with the original: faces with metadata, tags, and which faces changed. Usage: node patchcheck.js <copy-src-dir>. Writes patchcheck.json. */
const fs=require('fs'),path=require('path');
const A=require('/home/user/conv-dev/src'),B=require(process.argv[2]);
const ROOT='/home/user/sldprt-research-dump/';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const files=fs.readdirSync(ROOT).filter(n=>n.startsWith('test files')).flatMap(n=>walk(path.join(ROOT,n)));
const r={files:files.length,facesBefore:0,withMetaBefore:0,withMetaAfter:0,facesWhoseMetadataChanged:0,changedAreAllOdd:true,geometryDiffers:0,tagHistAfter:{}};
for(const f of files){const a=A.parse(f),b=B.parse(f);
  if(a.faces.length!==b.faces.length||a.stats&&b.stats&&a.stats.triangles!==b.stats.triangles)r.geometryDiffers++;
  a.faces.forEach((x,i)=>{r.facesBefore++;const y=b.faces[i];if(x.metadata)r.withMetaBefore++;if(y.metadata){r.withMetaAfter++;r.tagHistAfter[y.metadata.typeTag]=(r.tagHistAfter[y.metadata.typeTag]||0)+1;}
    if(!!x.metadata!==!!y.metadata||(x.metadata&&y.metadata&&x.metadata.typeTag!==y.metadata.typeTag)){r.facesWhoseMetadataChanged++;if(!(x.metadata&&(x.metadata.typeTag<4001||x.metadata.typeTag>4010)))r.changedAreAllOdd=false;}});}
fs.writeFileSync(path.join(__dirname,'patchcheck.json'),JSON.stringify(r,null,1)+'\n');console.log(JSON.stringify(r,null,1));
