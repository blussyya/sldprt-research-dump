// EXP-118 control: every display face in the corpus with mesh-boundary edges (one triangle, welded by
// exact coordinates) that carry no Block1 id. A face whose boundary is all labelled has none.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs'),path=require('path');
const files=[];const walk=p=>{for(const n of fs.readdirSync(p)){const q=path.join(p,n),st=fs.statSync(q);if(st.isDirectory()){if(!/exports|node_modules/i.test(n))walk(q);}else if(/\.sldprt$/i.test(n))files.push(q);}};
process.argv.slice(2).forEach(walk);
let faces=0,withEdges=0,hit=0,segs=0;
for(const file of files){let d;try{d=S.parse(fs.readFileSync(file));}catch(e){continue;}const out=[];
  d.faces.forEach((f,fi)=>{faces++;if(!f.edgeAnnotations||!f.edgeAnnotations.some(a=>a.id))return;withEdges++;
    const key=i=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2],pk=(a,b)=>a<b?a+'|'+b:b+'|'+a,use=new Map(),lab=new Set();
    const T=f.triangleIndices;for(let t=0;t<T.length;t+=3)for(const [a,b] of [[T[t],T[t+1]],[T[t+1],T[t+2]],[T[t+2],T[t]]]){const k=pk(key(a),key(b));use.set(k,(use.get(k)||0)+1);}
    for(const a of f.edgeAnnotations)if(a.id)lab.add(pk(key(a.vertices[0]),key(a.vertices[1])));
    const n=[...use].filter(([k,c])=>c===1&&!lab.has(k)).length;if(n){hit++;segs+=n;out.push(`${fi}:${n}`);}});
  if(out.length)console.log(path.basename(file),'faces with unlabelled boundary (face:segments)',out.join(' '));}
console.log(`files ${files.length}, faces ${faces}, faces with edge ids ${withEdges}, faces with unlabelled mesh boundary ${hit} (${segs} segments)`);
