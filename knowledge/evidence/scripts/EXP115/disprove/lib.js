// own helpers for the disprove run
const fs=require('fs'),path=require('path');
const S=require('/home/user/solidworks-converters/src');
const ROOT='/home/user/sldprt-research-dump/';
function files(){
  const out=[];
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
    if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))out.push(p);}})(ROOT);
  return out.filter(p=>/test files (online|new|original)/.test(p)).sort();
}
const key=(f,i)=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
// simple rule: weld by exact coords, join nonzero-id segments; return degree map
function simple(f){
  const adj=new Map();
  const add=(a,b,id)=>{if(!adj.has(a))adj.set(a,[]);adj.get(a).push({to:b,id});};
  const seg=new Map();
  for(const e of f.edgeAnnotations){if(e.id===0)continue;const a=key(f,e.vertices[0]),b=key(f,e.vertices[1]);
    // one segment appears once per triangle that owns it; keep the distinct segment
    const k=a<b?a+'|'+b:b+'|'+a;if(a===b)continue;
    if(!seg.has(k))seg.set(k,{a,b,id:e.id,n:0});seg.get(k).n++;}
  for(const s of seg.values()){add(s.a,s.b,s.id);add(s.b,s.a,s.id);}
  return {adj,seg};
}
module.exports={S,files,key,simple,ROOT};
