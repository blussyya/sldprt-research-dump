// EXP-115 (NQ-072): boundary cycles traced through the triangle fans, so seams and loops that touch
// at a vertex come out right. Vertices are welded by exact coordinates, as in boundaryCycles. Every
// boundary segment (nonzero Block1 id) is a cut; each triangle that owns a cut segment gives one
// half-edge. Around a vertex, triangles joined across uncut edges form a sector, and a sector's two
// half-edge ends are consecutive along the loop.
function sectorCycles(f){
  const key=i=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
  const rep=new Map(),K=i=>{const k=key(i);if(!rep.has(k))rep.set(k,i);return k;};
  const cut=new Map(),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  for(const e of f.edgeAnnotations)if(e.id!==0){const a=K(e.vertices[0]),b=K(e.vertices[1]);if(a!==b&&!cut.has(pk(a,b)))cut.set(pk(a,b),e.id);}
  const tris=[],at=new Map();
  for(let t=0;t<f.triangleIndices.length;t+=3){const k=[0,1,2].map(j=>K(f.triangleIndices[t+j]));if(k[0]===k[1]||k[1]===k[2]||k[0]===k[2])continue;
    const ti=tris.length;tris.push(k);for(const x of k){if(!at.has(x))at.set(x,[]);at.get(x).push(ti);}}
  const parent=new Map(),find=x=>{while(parent.get(x)!==x){parent.set(x,parent.get(parent.get(x)));x=parent.get(x);}return x;};
  const corner=(t,k)=>{const c=t+'@'+k;if(!parent.has(c))parent.set(c,c);return c;},union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent.set(a,b);};
  for(const [k,ts] of at){
    for(const t of ts)corner(t,k);
    const byOther=new Map();
    for(const t of ts)for(const m of tris[t])if(m!==k&&!cut.has(pk(k,m))){if(!byOther.has(m))byOther.set(m,[]);byOther.get(m).push(t);}
    for(const list of byOther.values())for(let i=1;i<list.length;i++)union(corner(list[0],k),corner(list[i],k));
  }
  const half=[];   // {t,a,b,id}
  for(const [p,id] of cut){const [a,b]=p.split('|');for(const t of at.get(a)||[])if(tris[t].includes(b))half.push({t,a,b,id});}
  const ends=new Map(); // sector -> [{h,node}]
  half.forEach((h,hi)=>{for(const node of [h.a,h.b]){const s=find(corner(h.t,node));if(!ends.has(s))ends.set(s,[]);ends.get(s).push({hi,node});}});
  for(const [s,e] of ends)if(e.length!==2)throw Error('Ambiguous boundary sector ('+e.length+' ends)');
  const next=(hi,node)=>{const s=find(corner(half[hi].t,node)),e=ends.get(s);return e[0].hi===hi&&e[0].node===node?e[1]:e[0];};
  const used=new Set(),cycles=[];
  for(let h0=0;h0<half.length;h0++)if(!used.has(h0)){
    const vertices=[],edgeIds=[];let hi=h0,from=half[h0].a,guard=0;
    do{if(used.has(hi))throw Error('Boundary walk reused a half-edge');used.add(hi);const h=half[hi],to=from===h.a?h.b:h.a;
      vertices.push(rep.get(from));edgeIds.push(h.id);const n=next(hi,to);hi=n.hi;from=to;if(++guard>1e6)throw Error('runaway');
    }while(hi!==h0);
    cycles.push({vertices,edgeIds});
  }
  return cycles;
}
module.exports={sectorCycles};
