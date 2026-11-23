'use strict';
// Scan 11: variant layout (no 8-byte array after the 132-byte bounds record). Parse it myself:
//  [132 bounds][u32 flag][arr12 pos][arr12 nrm][u32 scalarFlag][scalar arrs][3 words][u32 id][3 f64][u32 tag][8 f64][u32 count]
// Tabulate words vs tag validity. Control: the same function must reproduce 13533 good / 0 nz on the standard layout (scan2) -- here
// control = standard parse of accepted records through the same words/tag check.
const {walk,load,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
function arr(dl,o,stride){if(o+16>dl.length)return null;const h=[0,4,8,12].map(k=>dl.readUInt32LE(o+k));if(h[0]!==stride||h[1]!==100||h[2]!==2)return null;const e=o+16+stride*h[3];return e<=dl.length?{h,end:e}:null;}
function parseTail(dl,o,variant){ // o = geometryEnd+132
  const u=x=>x+4<=dl.length?dl.readUInt32LE(x):null;
  if(!variant){const a=arr(dl,o,8);if(!a)return null;o=a.end;}
  const flag=u(o);o+=4;const p=arr(dl,o,12);if(!p)return null;const n=arr(dl,p.end,12);if(!n)return null;o=n.end;
  const sf=u(o);o+=4;if(sf===1)for(let i=0;i<2;i++){const a=arr(dl,o,4);if(!a)return null;o=a.end;}else if(sf!==0)return null;
  return {flag,words:[u(o),u(o+4),u(o+8)],id:u(o+12),tag:u(o+40),count:u(o+40+68),end:o+40+72};
}
const T={};const ex=[];let sec={};
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  d.faces.forEach((face,i)=>{
    const std=!!face.metadata;const hdrFail=/Unexpected array header/.test(face.metadataError||'');
    if(!std&&!hdrFail)return;
    const s=face.geometryEnd+132;const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length;
    const t=parseTail(L.dl,s,!std);
    const key=(std?'standard(control)':'variant')+' '+(!t?'unparsed':(t.words.some(x=>x)?'wordsNZ':'wordsZero')+'/'+((t.tag>=4001&&t.tag<=4010)?'tagOK':'tagBAD'));
    T[key]=(T[key]||0)+1;
    if(t&&!std){const k=f.split('/').pop().slice(0,22);sec[k]=sec[k]||{};sec[k][key.split(' ')[1]]=(sec[k][key.split(' ')[1]]||0)+1;
      if(ex.length<4&&(t.words.some(x=>x)!==(t.tag<4001||t.tag>4010)))ex.push([k,face.offset,JSON.stringify(t)]);
      if(t.end>end+0&&!/x/.test('')){T['variant tail overruns next record']=(T['variant tail overruns next record']||0)+1;}}
  });
}
console.log(JSON.stringify(T,null,1));console.log('disagreeing examples (words vs tag):',JSON.stringify(ex));
for(const [k,v] of Object.entries(sec))console.log(k.padEnd(24),JSON.stringify(v));
