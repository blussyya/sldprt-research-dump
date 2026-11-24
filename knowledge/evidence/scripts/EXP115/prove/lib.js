'use strict';
// Own boundary-loop builders for EXP115 prove. Does not use f.boundaryCycles or sectorCycles.
// face = {vertices:Float32Array xyz, triangleIndices, edgeAnnotations:[{vertices:[a,b], id}]}

const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;

function prep(face){
  const nv=face.vertices.length/3, key=new Array(nv);
  for(let i=0;i<nv;i++)key[i]=face.vertices[3*i]+','+face.vertices[3*i+1]+','+face.vertices[3*i+2];
  const seg=new Map(); // pair -> {a,b,ids:Set}  (nonzero ids only)
  const zero=new Set();
  let selfSeg=0;
  for(const e of face.edgeAnnotations){
    const a=key[e.vertices[0]], b=key[e.vertices[1]];
    if(a===b){selfSeg++;continue;}
    const p=pk(a,b);
    if(e.id!==0){ if(!seg.has(p))seg.set(p,{a,b,ids:new Set()}); seg.get(p).ids.add(e.id); }
    else zero.add(p);
  }
  const conflict=[...seg.keys()].filter(p=>zero.has(p)).length;       // same welded segment seen with id 0 and nonzero
  const multiId=[...seg.values()].filter(s=>s.ids.size>1).length;     // same welded segment with two different nonzero ids
  const tris=[];let degenerate=0;
  for(let t=0;t<face.triangleIndices.length;t+=3){
    const k=[0,1,2].map(j=>key[face.triangleIndices[t+j]]);
    if(k[0]===k[1]||k[1]===k[2]||k[0]===k[2]){degenerate++;continue;}
    tris.push(k);
  }
  return {key,seg,tris,conflict,multiId,degenerate,selfSeg};
}

// ---- simple rule: graph of welded vertices, nonzero-id segments; ok when every vertex has exactly 2 neighbours
function simple(P){
  const nb=new Map();
  for(const s of P.seg.values()){
    for(const [x,y] of [[s.a,s.b],[s.b,s.a]]){if(!nb.has(x))nb.set(x,new Set());nb.get(x).add(y);}
  }
  const hist={};let ok=nb.size>0;
  for(const n of nb.values()){hist[n.size]=(hist[n.size]||0)+1;if(n.size!==2)ok=false;}
  let loops=null;
  if(ok){
    loops=[];const seen=new Set();
    for(const s of nb.keys())if(!seen.has(s)){
      const cyc=[];let prev=null,cur=s;
      do{seen.add(cur);cyc.push(cur);const n=[...nb.get(cur)];const nx=n[0]!==prev?n[0]:n[1];prev=cur;cur=nx;}while(cur!==s);
      loops.push(cyc);
    }
  }
  return {ok,hist,loops,vertices:nb.size};
}

// ---- fan walk. Boundary segments are cuts. Around a vertex, triangles joined across uncut edges form a fan.
// A fan's two end sides (triangle, cut edge) are consecutive on a loop.
function fan(P){
  const {tris,seg}=P;const issues=[];
  const at=new Map();
  tris.forEach((k,t)=>{for(const x of k){if(!at.has(x))at.set(x,[]);at.get(x).push(t);}});
  // triangles on each welded undirected edge
  const onEdge=new Map();
  tris.forEach((k,t)=>{for(const [x,y] of [[k[0],k[1]],[k[1],k[2]],[k[0],k[2]]]){const p=pk(x,y);if(!onEdge.has(p))onEdge.set(p,[]);onEdge.get(p).push(t);}});
  for(const [p,ts] of onEdge){
    if(ts.length>2)issues.push('edge on '+ts.length+' triangles');
    if(!seg.has(p)&&ts.length===1)issues.push('open edge without id');
    if(!seg.has(p)&&ts.length===2&&ts[0]===ts[1])issues.push('dup');
  }
  for(const p of seg.keys())if(!onEdge.has(p))issues.push('segment on no triangle');
  // sides
  const sides=[]; // {t,p,a,b}
  const sideIdx=new Map();
  for(const [p,s] of seg){for(const t of onEdge.get(p)||[]){sideIdx.set(t+'#'+p,sides.length);sides.push({t,p,a:s.a,b:s.b,ids:[...s.ids]});}}
  // fans per vertex
  const link=new Map(); // v -> pairs: for each side-end, its partner side
  const partner=new Map(); // side#vertex -> side index
  let badFans=0,fans=0;
  for(const [v,ts] of at){
    const ref=new Map();ts.forEach((t,i)=>ref.set(t,i));
    const par=ts.map((_,i)=>i),f=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
    for(const t of ts)for(const m of tris[t])if(m!==v){
      const p=pk(v,m);if(seg.has(p))continue;
      for(const u of onEdge.get(p))if(u!==t)par[f(ref.get(u))]=f(ref.get(t));
    }
    const comp=new Map();
    for(const t of ts){const r=f(ref.get(t));if(!comp.has(r))comp.set(r,[]);comp.get(r).push(t);}
    for(const members of comp.values()){
      const ends=[];
      for(const t of members)for(const m of tris[t])if(m!==v&&seg.has(pk(v,m)))ends.push(sideIdx.get(t+'#'+pk(v,m)));
      if(ends.length===0)continue;       // interior fan
      fans++;
      if(ends.length!==2){badFans++;issues.push('fan with '+ends.length+' ends');continue;}
      partner.set(ends[0]+'#'+v,ends[1]);partner.set(ends[1]+'#'+v,ends[0]);
    }
  }
  if(issues.length)return {ok:false,issues:[...new Set(issues)],loops:null,sides:sides.length,fans,badFans};
  // walk
  const used=new Array(sides.length).fill(0),loops=[];
  for(let s0=0;s0<sides.length;s0++)if(!used[s0]){
    const verts=[],ids=[];let s=s0,from=sides[s0].a,guard=0;
    do{
      used[s]++;const sd=sides[s],to=from===sd.a?sd.b:sd.a;
      verts.push(from);ids.push(sd.ids.length===1?sd.ids[0]:sd.ids.join('/'));
      const nx=partner.get(s+'#'+to);
      if(nx===undefined){issues.push('walk reached an unpaired end');break;}
      from=to;s=nx;
      if(++guard>sides.length+1){issues.push('walk does not close');break;}
    }while(s!==s0||from!==sides[s0].a);
    loops.push({verts,ids});
  }
  const timesUsed=used.every(u=>u===1);
  if(!timesUsed)issues.push('a side used '+[...new Set(used)].join('/')+' times');
  return {ok:issues.length===0,issues,loops,sides:sides.length,fans,badFans,eachSideOnce:timesUsed};
}

// canonical form of a cyclic sequence up to rotation and reversal
function canon(seq){
  const n=seq.length;let best=null;
  for(const s of [seq,[...seq].reverse()])for(let r=0;r<n;r++){
    const c=s.slice(r).concat(s.slice(0,r)).join(';');
    if(best===null||c<best)best=c;
  }
  return best;
}
const loopSet=loops=>loops.map(canon).sort().join('\n');

module.exports={prep,simple,fan,canon,loopSet,pk};
