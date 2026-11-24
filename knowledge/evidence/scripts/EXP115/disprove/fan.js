// Own fan walk: directed half-edges from triangle winding (interior on the left), cut = nonzero id.
// next(a->b in t) = rotate around b through uncut edges until the next cut edge leaving b.
const {key}=require('./lib');
function weld(f){
  const ids=new Map(),pts=[];
  const w=i=>{const k=key(f,i);if(!ids.has(k)){ids.set(k,ids.size);pts.push(i);}return ids.get(k);};
  return {w,pts};
}
function fanWalk(f){
  const {w,pts}=weld(f);
  const cutId=new Map(),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  const conflict=[];
  for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a===b)continue;
    const k=pk(a,b);if(cutId.has(k)&&cutId.get(k)!==e.id)conflict.push(k);cutId.set(k,e.id);}
  const tris=[],em=new Map(); // em: 'a>b' directed -> list of tri
  for(let t=0;t<f.triangleIndices.length;t+=3){
    const v=[0,1,2].map(j=>w(f.triangleIndices[t+j]));
    if(v[0]===v[1]||v[1]===v[2]||v[0]===v[2])continue;
    const ti=tris.length;tris.push(v);
    for(let j=0;j<3;j++){const d=v[j]+'>'+v[(j+1)%3];if(!em.has(d))em.set(d,[]);em.get(d).push(ti);}
  }
  const problems=[];
  for(const [d,l] of em)if(l.length>1)problems.push('dup directed edge '+d+' x'+l.length);
  // half edges
  const half=[];const hid=new Map();
  tris.forEach((v,t)=>{for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3];if(cutId.has(pk(a,b))){hid.set(t+':'+j,half.length);half.push({t,j,a,b,id:cutId.get(pk(a,b))});}}});
  // cut segments with no triangle (annotation without triangle)
  const covered=new Set(half.map(h=>pk(h.a,h.b)));
  for(const k of cutId.keys())if(!covered.has(k))problems.push('cut segment without triangle '+k);
  const next=h=>{
    let t=h.t,j=h.j;
    for(let guard=0;guard<10000;guard++){
      const v=tris[t],b=v[(j+1)%3],c=v[(j+2)%3];
      // outgoing edge from b in t is b->c (index (j+1)%3)
      const jn=(j+1)%3;
      if(cutId.has(pk(b,c)))return hid.get(t+':'+jn);
      const nb=em.get(c+'>'+b); // neighbour has c->b
      if(!nb||nb.length!==1){problems.push('open or multi uncut edge '+pk(b,c));return -1;}
      const t2=nb[0],v2=tris[t2];let k2=-1;for(let q=0;q<3;q++)if(v2[q]===c&&v2[(q+1)%3]===b)k2=q;
      // in t2 the edge c->b is index k2; next outgoing edge from b is index (k2+1)%3
      t=t2;j=k2;
    }
    problems.push('rotation did not end');return -1;
  };
  const nx=half.map(next);
  // permutation check
  const seen=new Array(half.length).fill(0);for(const n of nx)if(n>=0)seen[n]++;
  const notPerm=seen.filter(x=>x!==1).length;
  const used=new Array(half.length).fill(false),loops=[];
  for(let s=0;s<half.length;s++)if(!used[s]){
    const seq=[];let h=s,ok=true;
    while(!used[h]){used[h]=true;seq.push(h);h=nx[h];if(h<0){ok=false;break;}}
    loops.push({half:seq,closed:ok&&h===s,verts:seq.map(i=>half[i].a),ids:seq.map(i=>half[i].id),segs:seq.map(i=>pk(half[i].a,half[i].b))});
  }
  // sides per segment
  const sides=new Map();for(const h of half){const k=pk(h.a,h.b);if(!sides.has(k))sides.set(k,[]);sides.get(k).push(h.a<h.b?1:-1);}
  return {n:{verts:pts.length,tris:tris.length,half:half.length,cut:cutId.size},loops,problems,notPerm,conflict,sides,half};
}
module.exports={fanWalk,weld};
