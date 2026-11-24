// is triangle winding consistent as emitted? count uncut 2-triangle edges traversed the same way vs opposite
const {S,files,key}=require('./lib');
let same=0,opp=0,nm=0,faces=0,incons=0;const sample=[];
for(const p of files().filter((x,i)=>i%6===0)){
  const d=S.parse(p);
  for(const f of d.faces){if(f.noEdgeTable)continue;faces++;
    const ids=new Map();const w=i=>{const k=key(f,i);if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
    const cut=new Set();for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);cut.add(a<b?a+'|'+b:b+'|'+a);}
    const em=new Map();
    for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>w(f.triangleIndices[t+j]));
      if(v[0]===v[1]||v[1]===v[2]||v[0]===v[2])continue;
      for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],k=a<b?a+'|'+b:b+'|'+a;if(!em.has(k))em.set(k,[]);em.get(k).push(a<b?1:-1);}}
    let fs=0,fo=0;
    for(const [k,l] of em){if(cut.has(k))continue;if(l.length===2){if(l[0]===l[1]){same++;fs++;}else{opp++;fo++;}}else if(l.length>2)nm++;}
    if(fs&&fo)incons++;
  }}
console.log({faces,same,opp,nonmanifoldUncut:nm,facesMixed:incons});
