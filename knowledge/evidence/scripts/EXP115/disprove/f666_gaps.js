const {S,ROOT,key}=require('./lib');
const d=S.parse(ROOT+'test files online/2013/f666f342_head_face.sldprt');
for(const i of [75,448]){const f=d.faces[i];const w=new Map();const W=x=>{const k=key(f,x);if(!w.has(k))w.set(k,w.size);return w.get(k);};
  const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;const cut=new Set();for(const e of f.edgeAnnotations)if(e.id){const a=W(e.vertices[0]),b=W(e.vertices[1]);if(a!==b)cut.add(pk(a,b));}
  const cnt=new Map(),owner=new Map();for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>W(f.triangleIndices[t+j]));for(let j=0;j<3;j++){const k=pk(v[j],v[(j+1)%3]);cnt.set(k,(cnt.get(k)||0)+1);}}
  const open=[...cnt].filter(([k,c])=>c===1&&!cut.has(k)).map(([k])=>k);
  const adj=new Map();open.forEach(k=>{const [a,b]=k.split('|').map(Number);for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}});
  const degs={};for(const l of adj.values())degs[l.length]=(degs[l.length]||0)+1;
  // components
  const seen=new Set();let comps=0;for(const s of adj.keys())if(!seen.has(s)){comps++;const st=[s];seen.add(s);while(st.length){const x=st.pop();for(const y of adj.get(x))if(!seen.has(y)){seen.add(y);st.push(y);}}}
  // are open-edge vertices on the cut (annotated) boundary?
  const cutV=new Set();cut.forEach(k=>k.split('|').forEach(x=>cutV.add(+x)));
  console.log('face',i,'open uncut edges',open.length,'vertex degree hist',degs,'components',comps,'open vertices also on annotated boundary',[...adj.keys()].filter(v=>cutV.has(v)).length,'/',adj.size);}
