'use strict';
const fs=require('fs'),path=require('path');

const ROOT=path.resolve(__dirname,'../../../..');

function corpusFiles(){
  const out=[];
  for(const base of ['test files original','test files new','test files online']){
    const root=path.join(ROOT,base);if(!fs.existsSync(root))continue;
    (function walk(dir){
      for(const e of fs.readdirSync(dir,{withFileTypes:true})){
        const p=path.join(dir,e.name);
        if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))out.push(p);
      }
    })(root);
  }
  return [...new Set(out.map(p=>path.resolve(p)))].sort();
}

const relative=p=>path.relative(ROOT,p).replaceAll(path.sep,'/');
module.exports={ROOT,corpusFiles,relative};
