// Cross-check my raw walk against the converter, per face offset. Modern files only (legacy layouts differ).
const fs=require('fs'),path=require('path'),L=require('./lib'),D=require('/home/user/solidworks-converters/src/display.js');
const root='/home/user/sldprt-research-dump';const files=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files online');
const S=require('/home/user/solidworks-converters/src/container/modern');
let agree=0,dis=0;const rows=[];
for(const f of files){const raw=fs.readFileSync(f);if(S.isOLE2(raw))continue;let b;try{b=L.dlBytes(f);}catch(e){continue;}if(!b)continue;
  const e=D.extractDisplayLists(new Uint8Array(b),false);const mine=new Map(L.scan(b).map(x=>[x.off,L.meta(b,x)]));
  let a=0,d=0,cm=0,mm=0,badreason={};
  for(const fc of e.faces){const m=mine.get(fc.offset);const myok=m&&!m.err&&m.res.every(v=>v===0)&&m.tag>=4001&&m.tag<=4010;const cok=!!fc.metadata;
    if(myok===cok)a++;else{d++;}if(cok)cm++;if(myok)mm++;
    if(!cok&&fc.metadataError){const k=fc.metadataError.replace(/[0-9]+/g,'#');badreason[k]=(badreason[k]||0)+1;}}
  agree+=a;dis+=d;rows.push({f:path.basename(f),faces:e.faces.length,conv_meta:cm,my_meta:mm,disagree:d,badreason});}
fs.writeFileSync('xcheck.json',JSON.stringify(rows,null,1));
for(const r of rows)if(r.disagree||r.conv_meta<r.faces)console.log(r.f.slice(0,40),r.faces,r.conv_meta,r.my_meta,'dis',r.disagree,JSON.stringify(r.badreason));
console.log('agree',agree,'disagree',dis);
