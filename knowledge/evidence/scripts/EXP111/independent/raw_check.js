'use strict';
// Independent of the object reader. For SW2022 controlled files: ids of modelled features come from KeyWords XML only.
// (1) History records: u32 id followed by u32 time inside [ModelStamps, core.modified], found by byte scan of ResolvedFeatures.
// (2) FILETIME: 8-byte (hi,lo) pairs inside the window, with t > ModelStamps + 1 s (so not the document-creation folders).
// Then pair the k-th record with the k-th FILETIME by stream offset and compare. Prints one row per file.
const fs=require('fs'),path=require('path');
const P=require('../../../../../package/src/parasolid/partition');
const root='/home/user/sldprt-research-dump/test files new/SW2022/';
const EPOCH=11644473600n;let tot={files:0,feat:0,idsFound:0,ftCount:0,pairs:0,ge:0,eq:0,lt:0,mono:0};
for(const d of fs.readdirSync(root).filter(x=>/^C\d\d/.test(x))){
 const all=P.streams(fs.readFileSync(root+d+'/model.SLDPRT'));const g=s=>all[Object.keys(all).find(k=>k.endsWith(s))];
 const rf=g('Config-0-ResolvedFeatures'),ms=g('ModelStamps').readUInt32LE(0),core=g('docProps/core.xml').toString();
 const mod=Date.parse(/modified>([^<]+)/.exec(core)[1])/1000;
 const kw=g('swXmlContents/KeyWords').toString('utf8');
 const ids=[...kw.matchAll(/<(\w+) id="(\d+)" Name="([^"]*)"( Type="([^"]*)")?/g)].filter(m=>!['Keywords','Configuration'].includes(m[1])&&m[3]!=='Origin'&&(m[1]!=='Feature'||(m[5]==='Plane'&&+m[2]>4))).map(m=>+m[2]);   // modelled features and user planes
 const rec=[];for(let p=0;p+8<=rf.length;p++){const id=rf.readUInt32LE(p),t=rf.readUInt32LE(p+4);if(ids.includes(id)&&t>=ms&&t<=mod+1)rec.push({p,id,t});}
 const fts=[];for(let p=0;p+8<=rf.length;p++){const hi=rf.readUInt32LE(p),lo=rf.readUInt32LE(p+4);if(hi<0x01d00000||hi>0x01e00000)continue;const t=Number((BigInt(hi)<<32n|BigInt(lo))/10000n)/1000-Number(EPOCH);if(t>ms+1&&t<=mod+1)fts.push({p,t});}
 // keep only the first record of each id (later ones can be other references)
 const seen=new Set(),first=rec.filter(r=>!seen.has(r.id)&&seen.add(r.id));
 let ge=0,eq=0,lt=0;const n=Math.min(first.length,fts.length);for(let k=0;k<n;k++){const x=Math.floor(fts[k].t)-first[k].t;if(x>=0)ge++;else lt++;if(x===0)eq++;}
 const mono=fts.every((f,i)=>i===0||f.t>=fts[i-1].t);
 console.log(d.padEnd(32),'feature ids',String(ids.length).padStart(2),'records',String(first.length).padStart(2),'FT',String(fts.length).padStart(2),'pairs',n,'FT>=stamp',ge,'equal',eq,'FT<stamp',lt,'FT monotone',mono);
 tot.files++;tot.feat+=ids.length;tot.idsFound+=first.length;tot.ftCount+=fts.length;tot.pairs+=n;tot.ge+=ge;tot.eq+=eq;tot.lt+=lt;tot.mono+=mono?1:0;
}
console.log(JSON.stringify(tot));
