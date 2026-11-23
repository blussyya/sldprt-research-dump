'use strict';
// EXP109 shared loader: conv-dev reader, corpus walk. Faces with the Block3 byte at each strip control.
const fs=require('fs'),path=require('path');
const CORPUS='/home/user/sldprt-research-dump';
const S=require('/home/user/conv-dev/src');
function files(){const out=[];(function w(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())w(q);else if(/\.sldprt$/i.test(e.name))out.push(q);}})(path.join(CORPUS,'test files online'));
 for(const d of ['test files original','test files new']){try{(function w(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())w(q);else if(/\.sldprt$/i.test(e.name))out.push(q);}})(path.join(CORPUS,d));}catch(e){}}
 return out.sort();}
// per strip: {s,n,start(Block1 index of control),ctl(block1 value),b3ctl,labels[],b3labels[]}
function strips(f){const out=[];let at=0;f.stripLengths.forEach((n,s)=>{const len=2*n-2;out.push({s,n,start:at,len,ctl:f.block1[at],b3ctl:f.block3[at],labels:Array.from(f.block1.subarray(at+1,at+len)),b3labels:Array.from(f.block3.subarray(at+1,at+len))});at+=len;});return out;}
module.exports={S,files,strips,CORPUS};
