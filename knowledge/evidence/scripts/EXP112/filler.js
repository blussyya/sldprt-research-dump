// EXP-112: filler statistics per file. Gap = next header - end of previous data.
const fs=require('fs'),path=require('path');
const m=require('/home/user/solidworks-converters/src/container/modern.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const seen=new Set();let files=0,oneGap=0,g0=0,gN=0;const gaps=new Set(),pre=[],stamps=new Map(),afterDir=[],tail=[];let stampConst=0,preMod=0;
for(const f of walk(root)){const b=fs.readFileSync(f);if(m.isOLE2(b)||b[4]|b[5]|b[6])continue;const k=b.subarray(0,16).toString('hex')+b.length;if(seen.has(k))continue;seen.add(k);files++;
  const d=m.readDirectory(b);const mine=new Set();let st=new Set();
  for(let i=0;i<d.length;i++){st.add(b.readUInt32LE(d[i].header+10));if(i){const g=d[i].header-(d[i-1].dataStart+d[i-1].compSize);if(g)mine.add(g),gN++;else g0++;}}
  if(mine.size<=1)oneGap++;for(const g of mine)gaps.add(g);
  pre.push(d[0].header-8);const gsz=[...mine][0];if(gsz&&(d[0].header-8)%gsz===0)preMod++;
  if(st.size===1)stampConst++;const s=[...st][0];stamps.set(s,(stamps.get(s)||0)+1);
}
const mm=a=>Math.min(...a)+'..'+Math.max(...a);
console.log('distinct files',files,'files with at most one nonzero gap size',oneGap,'gaps: zero',g0,'nonzero',gN,'sizes',mm([...gaps]));
console.log('filler before the first header',mm(pre),'bytes; a whole multiple of the file\'s gap size in',preMod,'files');
console.log('stamp constant within file',stampConst,'distinct stamps',stamps.size);
const ex=[...stamps.keys()].slice(0,8).map(s=>{const t=s&0xffff,dt=s>>>16;return s.toString(16)+' -> '+(1980+(dt>>9))+'-'+((dt>>5)&15)+'-'+(dt&31)+' '+(t>>11)+':'+((t>>5)&63)+':'+((t&31)*2);});console.log(ex.join('\n'));
