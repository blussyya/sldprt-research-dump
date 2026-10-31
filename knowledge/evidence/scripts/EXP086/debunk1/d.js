const R='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters';
const fs=require('fs');const {readBrep}=require(R+'/src');
const D='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/sldprt-research-dump/';
const files=[];
for(const d of fs.readdirSync(D+'test files online')){const p=D+'test files online/'+d;if(!fs.statSync(p).isDirectory())continue;for(const f of fs.readdirSync(p))if(/\.sldprt$/i.test(f))files.push(p+'/'+f);}
function walk(p,dp){if(dp>3)return;let st;try{st=fs.readdirSync(p,{withFileTypes:true});}catch(e){return;}for(const e of st){const q=p+'/'+e.name;if(e.isDirectory())walk(q,dp+1);else if(/\.sldprt$/i.test(e.name))files.push(q);}}
walk(D+'test files new',0);
const tally={};let shown=0;
for(const f of files){let P;try{P=readBrep(f).parsed;}catch(e){continue;}
  const byIdx=new Map(P.nodes.map(n=>[n.index,n]));
  for(const n of P.nodes){if(n.name!=='OFFSET_SURF')continue;
    const b=byIdx.get(n.values.surface);const k=[b.name,'d'+(n.values.offset<0?'-':'+'),'os'+n.values.sense,'bs'+b.values.sense,'tru'+n.values.true_offset].join(' ');
    tally[k]=(tally[k]||0)+1;
    if(shown<2){console.log(f.replace(D,''),JSON.stringify(n.values),JSON.stringify(b.values).slice(0,200));shown++;}
  }}
console.log(tally);
