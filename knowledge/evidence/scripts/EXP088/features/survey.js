'use strict';
const fs=require('fs'),path=require('path'),{extract}=require('./export');
const root=path.resolve(__dirname,'../../../../..');
const files=[];for(const era of ['SW2011','SW2022'])for(const d of fs.readdirSync(path.join(root,'test files new',era))){const f=path.join(root,'test files new',era,d,'model.SLDPRT');if(fs.existsSync(f))files.push(f);}
for(const f of fs.readdirSync(path.join(root,'test files original')))if(/\.sldprt$/i.test(f))files.push(path.join(root,'test files original',f));
const results=files.map(f=>{try{const x=extract(f);return {file:path.relative(root,f),sha256:x.sha256,complete:x.complete,error:x.error,streamBytes:x.streamBytes,readBytes:x.readBytes,topCount:x.topCount,topRead:x.topRead,remainingHex:x.remainingHex.slice(0,32),features:x.features.length,children:x.children.length,unresolvedChildren:x.children.filter(c=>!c.resolved).length,references:x.featureReferences.length,unresolvedReferences:x.featureReferences.filter(r=>r.targetIndices.length!==1).length,history:x.history.length,unresolvedHistory:x.history.filter(h=>h.targets.length!==1).length,scannedStretches:x.scannedStretches};}catch(e){return {file:path.relative(root,f),complete:false,error:e.message};}});
console.log(JSON.stringify(results,null,2));
