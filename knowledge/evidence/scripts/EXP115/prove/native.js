'use strict';
// Native cross-check on modern files. For every joined display face: compare my display loops
// (edge-id sequence) with the native face's loops (coedge edge displayIds); classify the causes on faces the simple rule rejects.
const fs=require('fs');
const S=require('/home/user/solidworks-converters/src');
const J=require('/home/user/solidworks-converters/src/brep/display-join');
const L=require('./lib');
const files=require('./corpus_out.json').filter(r=>!r.ole&&r.faces).map(r=>r.file);
const root='/home/user/sldprt-research-dump/';
const collapse=seq=>{const o=[];for(const x of seq)if(!o.length||o[o.length-1]!==x)o.push(x);while(o.length>1&&o[0]===o[o.length-1])o.pop();return o;};
const sig=loops=>loops.map(l=>L.canon(collapse(l))).sort().join('\n');
const res={files:0,nativeFail:[],joined:0,unjoined:0,simple:{n:0,match:0,mismatch:[]},bad:{n:0,joined:0,match:0,mismatch:[],cause:{},unjoined:0,detail:[]}};
for(const f of files){
  const buf=fs.readFileSync(root+f);let d,M;
  try{d=S.parse(buf);M=S.brep.model(S.readBrep(buf).parsed);}catch(e){res.nativeFail.push([f,e.message.slice(0,80)]);continue;}
  res.files++;
  const jn=J.join(d.faces,M);
  d.faces.forEach((face,i)=>{
    const P=L.prep(face),s=L.simple(P),fn=L.fan(P);
    const isBad=!s.ok;const j=jn[i];
    if(isBad){res.bad.n++;}
    if(!j.face||j.how==='ambiguous'||j.how==='none'){res.unjoined++;if(isBad){res.bad.unjoined++;}return;}
    res.joined++;
    const nf=j.face;
    const nloops=nf.loops.map(l=>(l.coedges||[]).map(c=>{const e=M.edges.get(c.edge);return e?e.displayId:'?';})).filter(l=>l.length);
    let dloops;
    if(s.ok){
      dloops=s.loops.map(cyc=>cyc.map((v,k)=>{const w=cyc[(k+1)%cyc.length];return [...P.seg.get(L.pk(v,w)).ids][0];}));
      res.simple.n++;
      if(sig(dloops)===sig(nloops))res.simple.match++;else if(res.simple.mismatch.length<10)res.simple.mismatch.push({f,i,d:sig(dloops).slice(0,100),n:sig(nloops).slice(0,100)});
    }else{
      res.bad.joined++;
      dloops=fn.ok?fn.loops.map(l=>l.ids):[];
      const m=sig(dloops)===sig(nloops);if(m)res.bad.match++;else res.bad.mismatch.push({f,i,d:sig(dloops).slice(0,160),n:sig(nloops).slice(0,160)});
      // cause
      const cnt=new Map();for(const l of nf.loops)for(const c of l.coedges||[])cnt.set(c.edge,(cnt.get(c.edge)||0)+1);
      const twice=[...cnt].filter(([e,c])=>c>=2);
      const loopV=nf.loops.map(l=>{const vs=new Set();for(const c of l.coedges||[]){const e=M.edges.get(c.edge);if(e&&e.v)for(const v of e.v)vs.add(v);}return vs;});
      let touch=false;for(let a=0;a<loopV.length;a++)for(let b=a+1;b<loopV.length;b++)for(const v of loopV[a])if(loopV[b].has(v))touch=true;
      let cause=twice.length?'edge twice':touch?'loops touch at a vertex':nf.loops.length===0?'no loops (no edges)':'other';
      let extra='';
      if(twice.length){ // are both coedges of the edge on this face, with opposite sense?
        const info=twice.map(([e])=>{const cs=[];for(const l of nf.loops)for(const c of l.coedges)if(c.edge===e)cs.push(c.sense);return cs.join('');});
        const surf=nf.surface.type;extra=surf+' '+info.join(',');
        cause+=' / '+surf+(nf.loops.length>1&&twice.every(([e])=>1)?'':'');
      }
      res.bad.cause[cause]=(res.bad.cause[cause]||0)+1;
      res.bad.detail.push({f:f.replace(/.*\//,''),i,cause,hist:s.hist,nloops:nf.loops.length,twice:twice.length,touch,surface:nf.surface.type,how:j.how});
    }
  });
}
fs.writeFileSync(__dirname+'/native_out.json',JSON.stringify(res,null,1));
console.log(JSON.stringify({files:res.files,nativeFail:res.nativeFail,joined:res.joined,unjoined:res.unjoined,simple:{n:res.simple.n,match:res.simple.match,mism:res.simple.mismatch.length},bad:{n:res.bad.n,joined:res.bad.joined,unjoined:res.bad.unjoined,match:res.bad.match,mism:res.bad.mismatch.length,cause:res.bad.cause}},null,1));
