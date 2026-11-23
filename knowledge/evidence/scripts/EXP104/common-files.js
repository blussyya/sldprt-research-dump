'use strict';
const fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
function corpusFiles(){const out=[];for(const base of ['test files original','test files new','test files online']){const root=path.join(ROOT,base);if(!fs.existsSync(root))continue;
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))out.push(p);}})(root);}
  return [...new Set(out.map(p=>path.resolve(p)))].sort();}
module.exports={corpusFiles,rel:p=>path.relative(ROOT,p)};
