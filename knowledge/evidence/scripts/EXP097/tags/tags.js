// Count display-face surface tags (metadata.typeTag) across the corpus, every face, not only
// faces with surface parameters. Checks NQ-030's "tags 4003-4009 identified" against the corpus.
const fs=require('fs'),path=require('path');
const S=require('../../../../../package');
const {corpusFiles,relative}=require('../../EXP091/common');
const byTag={};
for(const file of corpusFiles()){
  let p;try{p=S.parse(file)}catch(e){continue}
  for(const f of p.faces||[]){
    if(!f.metadata)continue;const t=String(f.metadata.typeTag);
    const e=(byTag[t]??={faces:0,files:{}});e.faces++;e.files[relative(file)]=(e.files[relative(file)]||0)+1;
  }
}
console.log(JSON.stringify(byTag,null,1));
