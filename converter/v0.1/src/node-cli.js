#!/usr/bin/env node
'use strict';
/**
 * converter/v0.1 CLI
 *
 *   node converter/v0.1/src/node-cli.js <model.SLDPRT> [--stl out.stl] [--step out.step]
 *                                       [--ascii] [--faceted] [--scale N]
 *
 * With neither --stl nor --step, both are written next to the input.
 */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const parser=require(path.join(__dirname,'..','..','..','parser','v0.2','src','parser-core'));
const C=require('./convert-core');

function main(argv){
 const a=argv.slice(2);
 if(!a.length||a[0]==='-h'||a[0]==='--help'){
  console.log('usage: node node-cli.js <model.SLDPRT> [--stl out.stl] [--step out.step] [--ascii] [--faceted] [--scale N]');
  return 0;
 }
 const input=a[0];
 const opt=(name,def)=>{const i=a.indexOf(name);return i>=0&&a[i+1]&&!a[i+1].startsWith('--')?a[i+1]:def;};
 const has=name=>a.indexOf(name)>=0;
 const base=input.replace(/\.[^.\/]*$/,'');
 const wantStl=has('--stl')||!has('--step');
 const wantStep=has('--step')||!has('--stl');
 const stlOut=opt('--stl',base+'.converted.stl');
 const stepOut=opt('--step',base+'.converted.step');
 const scale=Number(opt('--scale',String(C.SCALE)));
 const name=path.basename(base);

 const parsed=parser.parseSLDPRT(fs.readFileSync(input),zlib.inflateRawSync,zlib.inflateSync);
 if(!parsed.faces||!parsed.faces.length){
  console.error('cannot convert: '+(parsed.errors&&parsed.errors.length?parsed.errors.join('; '):'no faces'));
  return 1;
 }
 const model=C.loadModel(parsed);
 const out={input,faces:model.faceCount,triangles:model.triangleCount};

 if(wantStl){
  const buf=has('--ascii')
   ? Buffer.from(C.toSTLAscii(model,{scale,name}),'ascii')
   : C.toSTLBinary(model,{scale});
  fs.writeFileSync(stlOut,buf);
  out.stl={file:stlOut,bytes:buf.length,format:has('--ascii')?'ascii':'binary'};
 }
 if(wantStep){
  const {text,report}=C.toSTEP(model,{scale,name,mode:has('--faceted')?'faceted':'auto'});
  fs.writeFileSync(stepOut,text);
  out.step={file:stepOut,bytes:text.length,...report};
 }
 console.log(JSON.stringify(out,null,2));
 return 0;
}

if(require.main===module)process.exit(main(process.argv));
module.exports={main};
