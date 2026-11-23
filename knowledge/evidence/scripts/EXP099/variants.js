#!/usr/bin/env node
'use strict';
/* EXP-099 step 5: record-boundary / grammar check over the whole corpus (modern DisplayLists).
 * For each face record, walk the converter's grammar by hand (same offsets as src/display.js metadata())
 * up to the reserved triple, and classify: reserved triple, tag in 4001..4010, whether the reader accepted it.
 * Also: the proposed guard (tag in 4001..4010 and reserved all zero) vs what the reader accepted.
 * Writes variants.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const files=fs.readdirSync(ROOT).filter(n=>n.startsWith('test files')).flatMap(n=>walk(path.join(ROOT,n)));
const u=(b,o)=>b.readUInt32LE(o);
function arr(b,o,stride){if(o+16>b.length)return null;if(u(b,o)!==stride||u(b,o+4)!==100||u(b,o+8)!==2)return null;const e=o+16+stride*u(b,o+12);return e<=b.length?{end:e,count:u(b,o+12)}:null;}
const out={modernParts:0,faces:0,readerAccepted:0,acceptedTagInRange:0,acceptedTagOutOfRange:0,acceptedReservedNonzero:0,
  guard:{acceptedAndPassesGuard:0,acceptedAndFailsGuard:0,failsGuardIds:[]},variants:{},partsWithRejects:{}};
for(const f of files){
  const buf=fs.readFileSync(f);if(S.container.modern.isOLE2(buf))continue;
  const d=S.parse(buf);if(!d.faces.length)continue;out.modernParts++;
  const b=Buffer.from(S.container.modern.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));
  const rel=path.relative(ROOT,f);
  for(const F of d.faces){
    out.faces++;
    let key;const m=F.metadata;
    // hand walk to the reserved triple
    const a8=arr(b,F.geometryEnd+132,8);let rv=null,sf=null;
    if(a8){const pos=arr(b,a8.end+4,12);const nor=pos&&arr(b,pos.end,12);
      if(nor){let o=nor.end;sf=u(b,o);o+=4;let ok=true;
        if(sf===1){for(let i=0;i<2;i++){const a=arr(b,o,4);if(!a){ok=false;break;}o=a.end;}}else if(sf!==0)ok=false;
        if(ok&&o+12<=b.length)rv=[u(b,o),u(b,o+4),u(b,o+8)];}}
    const rvk=rv?rv.map(x=>x===0xffffffff?'-1':x).join(','):'unwalkable';
    key=(m?'accepted':'rejected')+' | reserved='+rvk;
    out.variants[key]=(out.variants[key]||0)+1;
    if(m){out.readerAccepted++;
      const inR=m.typeTag>=4001&&m.typeTag<=4010,rz=m.reserved.every(x=>x===0);
      if(inR)out.acceptedTagInRange++;else out.acceptedTagOutOfRange++;
      if(!rz)out.acceptedReservedNonzero++;
      if(inR&&rz)out.guard.acceptedAndPassesGuard++;else{out.guard.acceptedAndFailsGuard++;out.guard.failsGuardIds.push({file:rel,tag:m.typeTag,reserved:m.reserved});}
    } else {out.partsWithRejects[rel]=(out.partsWithRejects[rel]||0)+1;}
  }
}
out.guard.failsGuardIds=out.guard.failsGuardIds.length+' faces, parts: '+JSON.stringify([...new Set(out.guard.failsGuardIds.map(x=>x.file))]);
fs.writeFileSync(path.join(__dirname,'variants.json'),JSON.stringify(out,null,1)+'\n');
const s={...out};delete s.partsWithRejects;console.log(JSON.stringify(s,null,1));console.log('parts with rejected metadata (modern):',Object.keys(out.partsWithRejects).length);
