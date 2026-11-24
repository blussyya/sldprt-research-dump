'use strict';
// Sweep the corpus: simple rule per face, fan walk on the faces the simple rule rejects and on all others (for equality).
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const S=require('/home/user/solidworks-converters/src');
const L=require('./lib');
const root='/home/user/sldprt-research-dump';
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files online');
for(const d of ['test files new','test files original'])(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/'+d);
files.sort();
const out=[];const t0=Date.now();
for(const f of files){
  const buf=fs.readFileSync(f);
  const rec={file:path.relative(root,f),sha:crypto.createHash('sha1').update(buf).digest('hex'),ole:S.container.modern.isOLE2(buf)};
  let d;try{d=S.parse(buf);}catch(e){rec.err=e.message;out.push(rec);continue;}
  rec.faces=d.faces.length;rec.noEdgeTable=d.faces.filter(x=>x.noEdgeTable).length;rec.simpleOk=0;rec.simpleBad=[];rec.fanOnBad=[];rec.eqChecked=0;rec.eqDiff=[];rec.fanFailOnOk=[];rec.dataIssues=0;
  d.faces.forEach((face,i)=>{
    if(face.noEdgeTable)return;
    const P=L.prep(face);
    if(P.conflict||P.multiId||P.degenerate||P.selfSeg)rec.dataIssues++;
    const s=L.simple(P),fn=L.fan(P);
    if(s.ok){
      rec.simpleOk++;
      if(!fn.ok)rec.fanFailOnOk.push({i,issues:fn.issues});
      else{rec.eqChecked++;
        if(L.loopSet(s.loops)!==L.loopSet(fn.loops.map(l=>l.verts)))rec.eqDiff.push(i);}
    }else{
      rec.simpleBad.push({i,hist:s.hist,fan:{ok:fn.ok,issues:fn.issues,loops:fn.loops&&fn.loops.length,sides:fn.sides,once:fn.eachSideOnce,
        loopLens:fn.loops&&fn.loops.map(l=>l.verts.length)},rawId:face.metadata&&face.metadata.rawId,
        conflict:P.conflict,multiId:P.multiId});
    }
  });
  out.push(rec);
}
fs.writeFileSync(__dirname+'/corpus_out.json',JSON.stringify(out));
const tot=(fn)=>out.reduce((a,r)=>a+fn(r),0);
console.log('files',out.length,'parsed with faces',out.filter(r=>r.faces).length,'seconds',(Date.now()-t0)/1000);
for(const [name,sel] of [['all',()=>true],['modern',r=>!r.ole],['ole',r=>r.ole]]){
  const R=out.filter(sel);
  console.log(name,'files',R.length,'faces',R.reduce((a,r)=>a+(r.faces||0),0),'noEdgeTable',R.reduce((a,r)=>a+(r.noEdgeTable||0),0),
   'simpleOk',R.reduce((a,r)=>a+(r.simpleOk||0),0),'simpleBad',R.reduce((a,r)=>a+(r.simpleBad?r.simpleBad.length:0),0));
}
console.log('bad by file:');for(const r of out)if(r.simpleBad&&r.simpleBad.length)console.log(' ',r.ole?'OLE':'mod',r.file,r.simpleBad.length);
console.log('fan failed on bad faces',tot(r=>(r.simpleBad||[]).filter(b=>!b.fan.ok).length),'eqChecked',tot(r=>r.eqChecked||0),'eqDiff',tot(r=>(r.eqDiff||[]).length),'fanFailOnOk',tot(r=>(r.fanFailOnOk||[]).length),'dataIssues',tot(r=>r.dataIssues||0));
