'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),worker=path.resolve(__dirname,'../web/parse-worker.js');
const html=fs.readFileSync(path.resolve(__dirname,'../web/index.html'),'utf8');
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const reports=[];
for(const rel of ['test files new/SW2011/C10_cube_shell_1mm/model.SLDPRT','test files new/SW2022/C15_torus/model.SLDPRT','test files original/SW2000-s01.SLDPRT']){
 let output;const ctx=vm.createContext({postMessage:x=>output=x});ctx.self=ctx;
 ctx.importScripts=(...files)=>{for(const f of files)vm.runInContext(fs.readFileSync(path.resolve(path.dirname(worker),f),'utf8'),ctx,{filename:f});};
 vm.runInContext(fs.readFileSync(worker,'utf8'),ctx);const b=fs.readFileSync(path.join(root,rel));ctx.onmessage({data:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});
 assert(output?.parsed);const r=output.parsed;
 if(rel.includes('SW2000'))assert(r.errors.length);else {assert(r.faces.length);assert(!r.faces[0].legacyTail);assert(!r.faces[0].metadata);}
 reports.push({file:rel,faces:r.faces.length,errors:Array.from(r.errors)});
}
console.log(JSON.stringify(reports));
