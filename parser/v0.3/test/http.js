'use strict';
const {spawn}=require('child_process'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const child=spawn(process.execPath,[path.resolve(__dirname,'../serve.js'),'--port','19083'],{stdio:['ignore','pipe','pipe']});
 try{
 const origin=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),10000);child.on('error',reject);child.stdout.on('data',b=>{text+=b;const m=text.match(/http:\/\/[^\s]+/);if(m){clearTimeout(timer);resolve(new URL(m[0]).origin);}});});
 const assets=['/parser/v0.3/web/index.html','/parser/v0.3/web/parse-worker.js','/parser/v0.3/src/parser-core.js','/parser/v0.1/src/parser-core.js','/parser/v0.3/src/ole-reader.js','/parser/v0.3/src/inflate.js','/viewer/mesh-data.js','/test%20files%20new/SW2011/C10_cube_shell_1mm/model.SLDPRT'];
 for(const asset of assets){const r=await fetch(origin+asset);assert.equal(r.status,200,asset);assert((await r.arrayBuffer()).byteLength>0);}
 console.log('HTTP assets passed: '+assets.length+' files, including worker imports and legacy demo.');
 }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
