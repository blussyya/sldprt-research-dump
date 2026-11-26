// Shared helpers for the disprove scripts. Own implementation of mesh-boundary analysis,
// independent of display.js's boundaryCycles.
'use strict';
const R='/home/user/solidworks-converters';
// key by exact float32 coordinates
function vkey(f,i){return f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];}
// Rebuild triangles and strip-edge labels from raw strip lengths and block1 (not from display.js's lists),
// so a misindex in display.js would show up as a disagreement.
function rebuild(f){
  const tris=[],labels=[];let v=0,t=0;
  f.stripLengths.forEach((n,s)=>{
    const ctl=f.block1[t++];
    if(ctl===0&&n===3){labels.push([v,v+2,f.block1[t++],s]);labels.push([v,v+1,f.block1[t++],s]);labels.push([v+1,v+2,f.block1[t++],s]);tris.push([v,v+1,v+2,s]);v+=n;return;}
    labels.push([v,v+1,f.block1[t++],s]);
    for(let i=2;i<n;i++){tris.push(i%2===0?[v+i-2,v+i-1,v+i,s]:[v+i-1,v+i-2,v+i,s]);labels.push([v+i-2,v+i,f.block1[t++],s]);labels.push([v+i-1,v+i,f.block1[t++],s]);}
    v+=n;
  });
  if(t!==f.block1.length)throw Error('block1 length mismatch '+t+' vs '+f.block1.length);
  return {tris,labels};
}
const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
// Mesh boundary of one face, welded by a key function (exact by default).
// Returns map edgeKey -> {uses, ids:Set, tris:[...]} and lists.
function meshEdges(f,key){
  key=key||(i=>vkey(f,i));
  const {tris,labels}=rebuild(f);
  const lab=new Map();
  for(const [a,b,id] of labels){const ka=key(a),kb=key(b);if(ka===kb)continue;const p=pk(ka,kb);if(!lab.has(p))lab.set(p,[]);lab.get(p).push(id);}
  const E=new Map();let degen=0;
  for(const [a,b,c,s] of tris){const k=[key(a),key(b),key(c)];if(k[0]===k[1]||k[1]===k[2]||k[0]===k[2]){degen++;continue;}
    for(const [x,y] of [[k[0],k[1]],[k[1],k[2]],[k[2],k[0]]]){const p=pk(x,y);if(!E.has(p))E.set(p,{uses:0,dir:[],strips:[]});const e=E.get(p);e.uses++;e.dir.push(x+'>'+y);e.strips.push(s);}}
  for(const [p,e] of E)e.ids=lab.get(p)||[];
  return {E,degen,tris,labels};
}
// chain mesh-boundary edges (uses==1) into components; report closed-ness
function chains(edges){
  const adj=new Map();
  for(const [p] of edges){const [a,b]=p.split('|');for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
  const seen=new Set(),comps=[];
  for(const s of adj.keys())if(!seen.has(s)){const st=[s],nodes=[];seen.add(s);while(st.length){const x=st.pop();nodes.push(x);for(const y of adj.get(x))if(!seen.has(y)){seen.add(y);st.push(y);}}
    const degs=nodes.map(n=>adj.get(n).length);comps.push({nodes,closed:degs.every(d=>d===2),degHist:degs.reduce((h,d)=>(h[d]=(h[d]||0)+1,h),{})});}
  return comps;
}
const P=k=>k.split(',').map(Number);
module.exports={R,vkey,rebuild,pk,meshEdges,chains,P};
