'use strict';
const fs=require('fs'),path=require('path');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const file=process.argv[2];const want=process.argv[3]||'';
const p=partition.readBody(fs.readFileSync(file),{}).parsed;
const trunc=v=>JSON.stringify(v,(k,x)=>(Array.isArray(x)&&x.length>12)?x.slice(0,12).concat(['...'+x.length]):x).slice(0,300);
for(const n of p.nodes){ if(!want||n.name===want) console.log(n.index,n.name,trunc(n.values)); }
