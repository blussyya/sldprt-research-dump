'use strict';
// EXP108: survey of the bytes after each face's edge table, over the modern corpus.
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',S=require(CONV),modern=require(CONV+'/container/modern'),inflate=require(CONV);
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):(/\.sldprt$/i.test(e.name)?[p]:[]);});
const files=['test files new','test files online','test files original'].flatMap(d=>walk(path.join(CORPUS,d)));
const H={head:{},strs:{},lens:{},ordered:0,withEdges:0,noStr:0,faces:0,idsInTail:0,idsMissing:0,tailZero:0};
const out=fs.createWriteStream(path.join(__dirname,'out','tail.jsonl'));
for(const f of files){
  let d,dl;
  try{const buf=new Uint8Array(fs.readFileSync(f));if(modern.isOLE2(buf))continue;const st=modern.decompressOpenSX(buf,inflate.inflateRaw,inflate.inflateZlib);
    dl=modern.findDisplayLists(buf,inflate.inflateRaw,inflate.inflateZlib);d=S.parse(f);}catch(e){continue;}
  if(!dl)continue;
  const dv=new DataView(dl.buffer,dl.byteOffset,dl.byteLength);
  // faces are in stream order in d.faces; face i's tail runs to faces[i+1].offset
  for(let i=0;i<d.faces.length;i++){
    const a=d.faces[i];if(!a.metadata)continue;
    const end=a.metadata.end,nx=d.faces[i+1]?d.faces[i+1].offset:dl.length;
    if(nx<=end)continue;
    H.faces++;
    const w=[];for(let o=end;o+4<=Math.min(nx,end+24);o+=4)w.push(dv.getUint32(o,true));
    const hk=w.slice(0,4).join(',');H.head[hk]=(H.head[hk]||0)+1;
    // first UTF-16 string
    let s='',so=-1;
    for(let o=end;o+2<nx;o++){ // find run of printable utf16
      let j=o,t='';while(j+2<=nx){const c=dv.getUint16(j,true);if(c>=32&&c<127){t+=String.fromCharCode(c);j+=2;}else break;}
      if(t.length>=8){s=t;so=o;break;}
    }
    const key=s.replace(/\d+/g,'N');H.strs[key]=(H.strs[key]||0)+1;
    if(!s)H.noStr++;
    const L=nx-end;const lk=L<400?L:'400+';H.lens[lk]=(H.lens[lk]||0)+1;
    // edge ids in tail words after string, in table order?
    const ids=[...new Set(a.metadata.edgeRecords.map(r=>r.id))];
    const wordsAfter=[];for(let o=so>=0?so+2*s.length:end;o+4<=nx;o+=4)wordsAfter.push(dv.getUint32(o,true));
    out.write(JSON.stringify({file:path.relative(CORPUS,f),i,len:L,n:a.metadata.edgeRecords.length,s,so:so-end,tag:a.metadata.typeTag})+'\n');
    if(ids.length){H.withEdges++;let p=-1,ok=true,miss=0;for(const id of ids){const q=wordsAfter.indexOf(id,p+1);if(q<0){ok=false;miss++;}else p=q;}
      if(ok)H.ordered++;H.idsMissing+=miss;H.idsInTail+=ids.length-miss;}
  }
}
out.end();
console.log(JSON.stringify(H,null,1));
