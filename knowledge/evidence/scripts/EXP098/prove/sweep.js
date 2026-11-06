// usage: node sweep.js [all|multi] ; per (file,config) child process with timeout; results -> results-<mode>.json
const fs=require('fs'),cp=require('child_process'),lib=require('./lib');
const K0=1;const mode=process.argv[2]||'multi',TO=+(process.argv[3]||600)*1000;
const en=JSON.parse(fs.readFileSync(__dirname+'/enum.json'));
let list=en.filter(x=>x.parts&&(mode==='multi'?x.parts.length>=2:x.parts.length===1));
const K=+(process.argv[4]||1),S=+(process.argv[5]||0);list=list.filter((x,i)=>i%K===S);
const outF=__dirname+'/results-'+mode+(K>1?'-'+S:'')+'.json';
const res=fs.existsSync(outF)?JSON.parse(fs.readFileSync(outF)):{};
for(const x of list){
  if(res[x.f]&&res[x.f].done)continue;
  const raw=fs.readFileSync(x.f);const {names}=lib.configs(raw);
  const d=lib.idx.parse(raw);
  const rec={hdrs:x.hdrs,display:{faces:d.faces.length,union:d.faces.length?lib.union(d.faces):null,errors:d.errors},configs:{}};
  for(const n of names){
    const t=Date.now();
    const r=cp.spawnSync('node',[__dirname+'/one.js',x.f,n],{timeout:TO,encoding:'utf8',maxBuffer:1<<26});
    let o;
    if(r.error||r.status!==0)o={error:(r.error&&r.error.code)||((r.stderr||'').trim().split('\n').slice(-1)[0])||'exit '+r.status};
    else o=JSON.parse(r.stdout);
    o.ms=Date.now()-t;
    if(o.box&&rec.display.union){o.gap=lib.gap(o.box,rec.display.union);o.fitNative=o.nativeFaces===rec.display.faces;o.fitExported=o.faces===rec.display.faces;}
    rec.configs[n]=o;
    console.log(x.f.split('/').pop(),n,o.error||('nf '+o.nativeFaces+' ef '+o.faces+' gap '+o.gap),o.ms+'ms');
  }
  // converter pick
  try{const rb=lib.P.readBody(raw,{},lib.codec);rec.converter={name:rb.configuration.name,by:rb.configuration.by,matches:rb.configuration.matches};}catch(e){rec.converter={error:e.message};}
  rec.done=true;res[x.f]=rec;fs.writeFileSync(outF,JSON.stringify(res,null,1));
}
