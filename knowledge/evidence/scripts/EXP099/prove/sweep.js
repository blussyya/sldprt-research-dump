// Sweep: for every SLDPRT in the corpus, classify each face record by (reserved words zero?, tag valid?).
const fs=require('fs'),path=require('path'),L=require('./lib');
const root='/home/user/sldprt-research-dump';
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files online');
for(const d of ['SW2022','SW2011'])(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files new/'+d);
const res=[];
for(const f of files){
  let b;try{b=L.dlBytes(f);}catch(e){res.push({f,err:e.message});continue;}
  if(!b){res.push({f,err:'no DL'});continue;}
  const sc=L.scan(b),c={n:sc.length,z_ok:0,z_bad:0,nz_ok:0,nz_bad:0,err:0,badtags:{}};
  for(const x of sc){const m=L.meta(b,x);if(m.err){c.err++;continue;}
    const z=m.res.every(v=>v===0),ok=m.tag>=4001&&m.tag<=4010;
    c[(z?'z_':'nz_')+(ok?'ok':'bad')]++;if(!ok&&!z)c.badtags[m.tag]=(c.badtags[m.tag]||0)+1;}
  res.push({f:path.relative(root,f),...c});
}
fs.writeFileSync('sweep.json',JSON.stringify(res,null,1));
const T={n:0,z_ok:0,z_bad:0,nz_ok:0,nz_bad:0,err:0};
for(const r of res){if(r.err&&!r.n)continue;for(const k in T)T[k]+=r[k]||0;if(r.nz_bad||r.nz_ok||r.z_bad)console.log(r.f.slice(-70),r.n,'z_ok',r.z_ok,'z_bad',r.z_bad,'nz_ok',r.nz_ok,'nz_bad',r.nz_bad,'err',r.err);}
console.log('TOTAL',JSON.stringify(T),'files',res.length);
