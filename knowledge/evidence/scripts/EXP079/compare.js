// Compare the feature trees of two .SLDPRT files object by object: top-level features are paired by
// name, then every field is compared. Prints fields present in only one file and values that differ.
// usage: node compare.js A.SLDPRT B.SLDPRT
const {load}=require('./load');
const [fa,fb]=process.argv.slice(2);const A=load(fa),B=load(fb);
for(const [n,x] of [['A',A],['B',B]])console.log(n,x.legacy?'SW2011 layout':'SW2022 layout','first index',x.start,x.end?'reads to the end':'STOP '+x.err.message);
const skip=new Set(['at','end','index']);
const out=[];
function cmp(a,b,path){
  if(a===b)return;
  const ta=a===null?'null':Array.isArray(a)?'array':typeof a,tb=b===null?'null':Array.isArray(b)?'array':typeof b;
  if(ta==='object'&&tb==='object'){
    if(a.ref!==undefined&&b.ref!==undefined&&Object.keys(a).length===1&&Object.keys(b).length===1)return;   // back-references: indices shift
    if(a.class!==b.class)out.push([path,'class',a.class,b.class]);
    for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(skip.has(k))continue;
      if(!(k in a))out.push([path+'.'+k,'only B',undefined,b[k]]);else if(!(k in b))out.push([path+'.'+k,'only A',a[k],undefined]);else cmp(a[k],b[k],path+'.'+k);}
    return;}
  if(ta==='array'&&tb==='array'){if(a.length!==b.length)out.push([path,'length',a.length,b.length]);for(let i=0;i<Math.min(a.length,b.length);i++)cmp(a[i],b[i],path+'['+i+']');return;}
  out.push([path,'value',a,b]);
}
const key=o=>o?(o.name!==undefined&&o.name!==''?o.name:o.class):'(null)';
const mb=new Map();B.tops.forEach((o,i)=>mb.set(key(o),o));const seen=new Set();
for(const o of A.tops){const k=key(o);if(!mb.has(k)){out.push([k,'only A',o&&o.class,undefined]);continue;}seen.add(k);cmp(o,mb.get(k),k);}
for(const o of B.tops)if(!seen.has(key(o)))out.push([key(o),'only B',undefined,o&&o.class]);
const show=v=>v===undefined?'-':JSON.stringify(v,(k,x)=>skip.has(k)?undefined:x).slice(0,140);
for(const [p,kind,a,b] of out)console.log(kind.padEnd(7),p,'|',show(a),'|',show(b));
