'use strict';
// Compare node tail FILETIME (floored to s) with the SW2011 log Created / Modified unix times, per feature, 25 files.
const r=require('./out/log2011.json');
let n=0,eqC=0,eqM=0,eqEither=0,inRange=0;const rows=[];
for(const x of r){const L=new Map(x.logs.map(l=>[l.name,l]));
 for(const nd of x.nodes){const l=L.get(nd.name);if(!l||nd.t<1e9)continue;
  const C=(l.stamps.find(s=>s.what==='Created')||{}).time,M=(l.stamps.find(s=>s.what==='Modified')||{}).time;const f=Math.floor(nd.t);
  n++;const ec=C===f,em=M===f;if(ec)eqC++;if(em)eqM++;if(ec||em)eqEither++;
  rows.push([x.d,nd.name,C,M,nd.t.toFixed(3),f-C,M===undefined?'':f-M].join('\t'));}}
console.log({n,eqC,eqM,eqEither});
require('fs').writeFileSync('out/cmp2011.tsv','file\tname\tlogCreated\tlogModified\tnodeFT\tnode-Created\tnode-Modified\n'+rows.join('\n')+'\n');
// user features only (id>=18)
const u=rows.filter(s=>!/Plane|Origin|Comments|Binder|Annot|Bodies|Equations|Material/.test(s.split('\t')[1]));
console.log(u.slice(0,40).join('\n'));
