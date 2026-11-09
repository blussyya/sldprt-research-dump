// Corpus sweep for EXP106. For every SLDPRT with 2+ partitions: build candidates as readBody does,
// run choose() under HEAD, OLD (517476c) and FULL variants, and under 12 candidate orders (forward,
// reverse, 10 seeded shuffles). Writes one JSON row per file to results.jsonl.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const C='/home/user/conv-dev/src/parasolid/';
const P=require(C+'partition');
const V={HEAD:require('./variants/select_HEAD.js'),OLD:require('./variants/select_OLD_517476c.js'),FULL:require('./variants/select_FULL.js')};
const MAX=128*1024*1024;
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:MAX}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:MAX})};
const root='/home/user/sldprt-research-dump';
function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory())walk(p,out);else if(/\.sldprt$/i.test(e.name))out.push(p);}return out;}
const files=walk(root).filter(f=>!/node_modules|\/package\//.test(f)).sort();
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function build(all,names){return names.map(name=>{try{return {name,...P.assemble(all,name,codec,{})};}catch(e){return {name,parsed:{error:e.message}};}});}
const out=[];
for(const f of files){
  const rel=path.relative(root,f);
  const raw=new Uint8Array(fs.readFileSync(f));
  let all,prim;
  try{all=P.streams(raw,codec);prim=P.extractPrimary(raw,all,codec,{});}catch(e){out.push({file:rel,skip:'no primary: '+e.message.slice(0,80)});continue;}
  if(prim.candidates.length<2){out.push({file:rel,n:prim.candidates.length,skip:'single partition'});continue;}
  const names=prim.candidates;
  const row={file:rel,candidates:names.length,chosenBy:prim.chosenBy,active:prim.name,picks:{},orders:{}};
  // production path only runs for chosenBy 'lowest'; we run the tie-break on every multi-partition file
  const built0=build(all,names);
  const t0=process.hrtime.bigint();
  let r0;try{r0=V.HEAD.choose(raw,build(all,names),codec.inflateRaw,codec.inflate);}catch(e){row.headError=e.message;}
  row.headMs=Number(process.hrtime.bigint()-t0)/1e6;
  if(r0){row.fits=r0.matches;row.displayFaces=r0.displayFaces;row.headPick=r0.name;
    row.rows=r0.rows.map(x=>({name:x.name,faces:x.faces,gap:x.gap,error:x.error,residual:x.residual?{pos:x.residual.pos,ang:x.residual.ang}:undefined}));}
  for(const k of ['OLD','FULL']){try{const r=V[k].choose(raw,build(all,names),codec.inflateRaw,codec.inflate);row[k+'Pick']=r.name;row[k+'Matches']=r.matches;}catch(e){row[k+'Error']=e.message;}}
  // order sweep (HEAD)
  const seq=[['fwd',names],['rev',[...names].reverse()]];
  const r=rng(files.indexOf(f)+1);for(let i=0;i<10;i++)seq.push(['shuf'+i,shuffle(names,r)]);
  const picks={};
  for(const [label,ord] of seq){try{const x=V.HEAD.choose(raw,build(all,ord),codec.inflateRaw,codec.inflate);picks[label]=x.name;}catch(e){picks[label]='ERR:'+e.message.slice(0,60);}}
  row.orderPicks=picks;row.distinctPicks=[...new Set(Object.values(picks))];
  out.push(row);
  process.stdout.write('.');
}
fs.writeFileSync(path.join(__dirname,'results.jsonl'),out.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log('\nfiles',files.length,'rows',out.length,'multi',out.filter(x=>x.candidates>=2).length);
