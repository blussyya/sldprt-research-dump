const {S,ROOT,key}=require('./lib');
const d=S.parse(ROOT+'test files original/chainwheel.sldprt');
const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function analyse(f,perm){ // perm: for control-0 strips (n=3), token order -> edge index among [01,02,12]->[0,1,2]
  const ids=new Map();const W=x=>{const k=key(f,x);if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
  // rebuild annotation: group the converter's annotations by strip
  const byStrip=new Map();for(const e of f.edgeAnnotations){if(!byStrip.has(e.strip))byStrip.set(e.strip,[]);byStrip.get(e.strip).push(e);}
  const cut=new Set();
  for(const [s,list] of byStrip){
    let l=list;
    if(f.stripControls[s]===0&&f.stripLengths[s]===3&&perm){ // list order: (v,v+1),(v,v+2),(v+1,v+2)
      const toks=list.map(e=>e.id),vs=list.map(e=>e.vertices);
      l=vs.map((v,i)=>({vertices:v,id:toks[perm[i]]}));}
    for(const e of l)if(e.id){const a=W(e.vertices[0]),b=W(e.vertices[1]);if(a!==b)cut.add(pk(a,b));}
  }
  const cnt=new Map();
  for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>W(f.triangleIndices[t+j]));for(let j=0;j<3;j++){const k=pk(v[j],v[(j+1)%3]);cnt.set(k,(cnt.get(k)||0)+1);}}
  let openNotCut=0,cutInterior=0;for(const [k,c] of cnt){if(c===1&&!cut.has(k))openNotCut++;}
  return openNotCut;
}
let c0Faces=0,c0Bad=0,c1Bad=0,c1Faces=0;
d.faces.forEach(f=>{const has0=f.stripControls.includes(0);const o=analyse(f,null);
  if(has0){c0Faces++;if(o)c0Bad++;}else{c1Faces++;if(o)c1Bad++;}});
console.log({c0Faces,c0Bad,c1Faces,c1Bad});
const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
for(const p of perms){let bad=0,tot=0;d.faces.forEach(f=>{if(!f.stripControls.includes(0))return;tot++;if(analyse(f,p))bad++;});console.log('perm',p.join(''),'faces with open-not-cut',bad,'of',tot);}
