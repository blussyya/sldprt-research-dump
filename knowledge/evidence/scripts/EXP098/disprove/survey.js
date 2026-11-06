// Survey: per file, partition names, ModelHeader presence, Header2 pick.
const fs=require('fs'),path=require('path');
const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const files=['test files original','test files new','test files online'].flatMap(f=>walk(path.join(root,f)));
const out=[];
for(const f of files){
  const row={f};
  try{const raw=fs.readFileSync(f);const s=P.streams(raw);
    const k=Object.keys(s);
    row.parts=k.filter(x=>/Config-\d+-Partition$/.test(x));
    row.mh=k.filter(x=>/Config-\d+-ModelHeader$/.test(x));
    row.h2=!!s.Header2;
    try{const a=P.extractPrimary(raw,s);row.by=a.chosenBy;row.primary=a.name;}catch(e){row.err=e.message}
  }catch(e){row.err='streams:'+e.message}
  out.push(row);
}
fs.writeFileSync(__dirname+'/survey.json',JSON.stringify(out,null,1));
const multi=out.filter(r=>r.parts&&r.parts.length>1);
console.log('files',out.length,'multi',multi.length,'multi+MH',multi.filter(r=>r.mh.length).length,'multi noMH',multi.filter(r=>!r.mh.length).length,'errs',out.filter(r=>r.err).length);
