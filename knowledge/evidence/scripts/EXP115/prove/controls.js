'use strict';
// Controls for EXP115 prove: known-answer synthetic faces, a real cube, and deliberately broken faces.
const fs=require('fs');
const L=require('./lib');
const S=require('/home/user/solidworks-converters/src');
const f32=Math.fround;
const K=p=>p.map(f32).join(',');
let pass=0,fail=0;
const T=(name,ok,note)=>{console.log((ok?'PASS ':'FAIL ')+name+(note?'  ['+note+']':''));ok?pass++:fail++;};

// build a face object. verts: [[x,y,z]], tris: [[i,j,k]], idOf(pairKeyByCoords)->id (0 for interior)
function mk(verts,tris,idOf){
  const vertices=new Float32Array(verts.flat());
  const key=i=>K(verts[i]);
  const ann=[];
  for(const t of tris){ // annotate like the strips do: every triangle edge once, id by welded segment
    for(const [a,b] of [[t[0],t[1]],[t[0],t[2]],[t[1],t[2]]])ann.push({vertices:[a,b],id:idOf(key(a),key(b))});
  }
  return {vertices,triangleIndices:Uint32Array.from(tris.flat()),edgeAnnotations:ann};
}
// edges seen by exactly one triangle (by coordinates) are boundary; ids from a map.
function boundaryIds(verts,tris,idFor){
  const cnt=new Map();
  for(const t of tris)for(const [a,b] of [[t[0],t[1]],[t[0],t[2]],[t[1],t[2]]]){const p=L.pk(K(verts[a]),K(verts[b]));cnt.set(p,(cnt.get(p)||0)+1);}
  return (ka,kb)=>{const p=L.pk(ka,kb);return cnt.get(p)===1?idFor(p):0;};
}
function grid(N,removed,dupFn){ // N x N cells, 2 triangles each; dupFn(i,j,cellRow,cellCol) -> vertex coords override
  const verts=[],idx=new Map();
  const vid=(x,y,z,tag)=>{const k=x+','+y+','+tag;if(!idx.has(k)){idx.set(k,verts.length);verts.push([x,y,z]);}return idx.get(k);};
  const tris=[];
  for(let cy=0;cy<N;cy++)for(let cx=0;cx<N;cx++){
    if(removed.has(cx+','+cy))continue;
    const tg=(x,y)=>dupFn?dupFn(x,y,cx,cy):'';
    const a=vid(cx,cy,0,tg(cx,cy)),b=vid(cx+1,cy,0,tg(cx+1,cy)),c=vid(cx+1,cy+1,0,tg(cx+1,cy+1)),d=vid(cx,cy+1,0,tg(cx,cy+1));
    tris.push([a,b,c],[a,c,d]);
  }
  return {verts,tris};
}
const loopsKeys=(r)=>r.loops.map(l=>l.verts);
const expectSet=ls=>ls.map(l=>L.canon(l.map(x=>typeof x==='string'?x:K(x)))).sort().join('\n');
function runBoth(face){const P=L.prep(face);return {P,s:L.simple(P),fn:L.fan(P)};}
const ring=(pts)=>pts; // readability

// ---- 1 annulus: 6x6 grid, centre 2x2 removed. Known: loops of 24 and 8 unit segments, simple rule applies.
{
  const N=6,rem=new Set(['2,2','3,2','2,3','3,3']);
  const {verts,tris}=grid(N,rem);
  let n=0;const ids=new Map();
  const face=mk(verts,tris,boundaryIds(verts,tris,p=>{if(!ids.has(p))ids.set(p,++n);return ids.get(p);}));
  const outer=[];for(let i=0;i<6;i++)outer.push([i,0,0]);for(let i=0;i<6;i++)outer.push([6,i,0]);for(let i=6;i>0;i--)outer.push([i,6,0]);for(let i=6;i>0;i--)outer.push([0,i,0]);
  const inner=[[2,2,0],[3,2,0],[4,2,0],[4,3,0],[4,4,0],[3,4,0],[2,4,0],[2,3,0]];
  const r=runBoth(face),exp=expectSet([outer,inner]);
  T('annulus: simple rule accepts',r.s.ok&&r.s.loops.length===2);
  T('annulus: simple loops = known (24 and 8)',r.s.ok&&expectSet(r.s.loops)===exp);
  T('annulus: fan loops = known',r.fn.ok&&expectSet(loopsKeys(r.fn))===exp);
  T('annulus: each side once',r.fn.eachSideOnce&&r.fn.sides===32,'sides '+r.fn.sides);
}
// ---- 2 cylinder with seam. N=12 columns, 3 rows. Known: ONE loop of 2*12+2*... bottom 12, seam 3 up, top 12, seam 3 down = 30 sides.
{
  const N=12,R=3,verts=[],tris=[];
  const at=(c,r)=>{const a=(c%N)/N*2*Math.PI;return [Math.cos(a),Math.sin(a),r];};
  const id=new Map();const vi=(c,r)=>{const k=c+','+r;if(!id.has(k)){id.set(k,verts.length);verts.push(at(c,r));}return id.get(k);};
  for(let c=0;c<N;c++)for(let r=0;r<R;r++){const a=vi(c,r),b=vi(c+1,r),d=vi(c+1,r+1),e=vi(c,r+1);tris.push([a,b,d],[a,d,e]);}
  const idOf=(ka,kb)=>{ // identify by coordinates
    const [ax,ay,az]=ka.split(',').map(Number),[bx,by,bz]=kb.split(',').map(Number);
    if(az===0&&bz===0)return 1;if(az===R&&bz===R)return 3;
    if(Math.abs(az-bz)===1&&ax===f32(1)&&bx===f32(1)&&ay===0&&by===0)return 2;return 0;};
  const face=mk(verts,tris,idOf);
  const bottom=[],top=[];for(let c=0;c<N;c++){bottom.push(at(c,0));top.push(at(c,R));}
  const seam=r=>at(0,r);
  const loop=[...bottom,seam(1),seam(2),...[...top].reverse(),seam(2),seam(1)];
  // loop order: bottom ring c=0..N-1 then ends at seam(0)... walk: bottom0..bottom(N-1), back to bottom0 (=seam 0), up seam 1,2, to top0, top ring back, down seam
  // from-vertex of each of the 30 sides, written out by hand: bottom ring b0..b11, seam up b0,s1,s2, top ring t0,t11..t1, seam down t0,s2,s1
  const lp=[];for(let c=0;c<N;c++)lp.push(at(c,0));lp.push(at(0,0),seam(1),seam(2));lp.push(at(0,R));for(let c=N-1;c>=1;c--)lp.push(at(c,R));lp.push(at(0,R),seam(2),seam(1));
  const r=runBoth(face);
  T('seam cylinder: simple rule rejects (degree 3 at seam)',!r.s.ok,JSON.stringify(r.s.hist));
  T('seam cylinder: fan walk gives one loop of 30 sides',r.fn.ok&&r.fn.loops.length===1&&r.fn.loops[0].verts.length===2*N+2*R,r.fn.ok?'len '+r.fn.loops[0].verts.length:r.fn.issues);
  T('seam cylinder: loop = known vertex sequence',r.fn.ok&&expectSet(loopsKeys(r.fn))===expectSet([lp]));
  T('seam cylinder: seam segments walked on both sides',r.fn.ok&&r.fn.sides===2*N+2*R&&r.fn.eachSideOnce);
  T('seam cylinder: id sequence has id 2 twice per seam segment',r.fn.ok&&r.fn.loops[0].ids.filter(x=>x===2).length===2*(R));
}
// ---- 3 slit: 8x8 grid, vertices (2..5,4) duplicated above the slit line. Known: outer 32 + slit loop of 6 sides.
{
  const N=8;
  const dup=(x,y,cx,cy)=>(y===4&&x>=3&&x<=5&&cy===4)?'up':'';   // slit between x=3..5 -> interior vertices (3,4),(4,4),(5,4) dup above; tips are (2,4)? see below
  // slit runs x=2..6: tips (2,4) and (6,4) are NOT duplicated (they stay joined), interior (3..5,4) are duplicated above
  const {verts,tris}=grid(N,new Set(),dup);
  const idOf=(ka,kb)=>{const [ax,ay]=ka.split(',').map(Number),[bx,by]=kb.split(',').map(Number);
    if(ay===4&&by===4&&ax>=2&&ax<=6&&bx>=2&&bx<=6)return 9;   // slit segments
    if(ax===0&&bx===0||ax===8&&bx===8||ay===0&&by===0||ay===8&&by===8)return 1+(ax+ay+bx+by);return 0;};
  const face=mk(verts,tris,idOf);
  const outer=[];for(let i=0;i<8;i++)outer.push([i,0,0]);for(let i=0;i<8;i++)outer.push([8,i,0]);for(let i=8;i>0;i--)outer.push([i,8,0]);for(let i=8;i>0;i--)outer.push([0,i,0]);
  const slit=[[2,4,0],[3,4,0],[4,4,0],[5,4,0],[6,4,0],[5,4,0],[4,4,0],[3,4,0]];
  const r=runBoth(face);
  T('slit: simple rule rejects (tips degree 1)',!r.s.ok,JSON.stringify(r.s.hist));
  T('slit: fan loops = known (outer 32, slit 8 sides)',r.fn.ok&&expectSet(loopsKeys(r.fn))===expectSet([outer,slit]),r.fn.ok?r.fn.loops.map(l=>l.verts.length):r.fn.issues);
  T('slit: each side once',r.fn.ok&&r.fn.eachSideOnce);
}
// ---- 4 two loops touching at a vertex: 6x6 grid, cells (2,2) and (3,3) removed, touch at (3,3).
{
  const {verts,tris}=grid(6,new Set(['2,2','3,3']));let n=0;const ids=new Map();
  const face=mk(verts,tris,boundaryIds(verts,tris,p=>{if(!ids.has(p))ids.set(p,++n);return ids.get(p);}));
  const outer=[];for(let i=0;i<6;i++)outer.push([i,0,0]);for(let i=0;i<6;i++)outer.push([6,i,0]);for(let i=6;i>0;i--)outer.push([i,6,0]);for(let i=6;i>0;i--)outer.push([0,i,0]);
  // Merged loop, worked out by hand with the material on the left: hole 1 clockwise to (3,3), the NW wedge leads up to hole 2's left edge,
  // hole 2 clockwise back to (3,3), the SE wedge leads to hole 1's right edge. (My first expectation was two separate 4-loops; that was wrong:
  // each wedge at a pinch joins an edge of one hole to an edge of the other.)
  const merged=[[2,2,0],[2,3,0],[3,3,0],[3,4,0],[4,4,0],[4,3,0],[3,3,0],[3,2,0]];
  const h1=[[2,2,0],[3,2,0],[3,3,0],[2,3,0]],h2=[[3,3,0],[4,3,0],[4,4,0],[3,4,0]];
  const r=runBoth(face);
  T('touching holes: simple rule rejects (degree 4)',!r.s.ok,JSON.stringify(r.s.hist));
  T('touching holes: fan loops = outer 24 + one merged 8-loop',r.fn.ok&&expectSet(loopsKeys(r.fn))===expectSet([outer,merged]),r.fn.ok?r.fn.loops.map(l=>l.verts.length):r.fn.issues);
  T('touching holes: the walk does NOT give the two separate 4-loops (limit of the rule)',r.fn.ok&&expectSet(loopsKeys(r.fn))!==expectSet([outer,h1,h2]));
  T('touching holes: each side once',r.fn.ok&&r.fn.eachSideOnce&&r.fn.sides===32);
}
// ---- 5 real cube (C00): 6 faces, each one loop with 4 distinct edge ids
{
  const f='/home/user/sldprt-research-dump/test files new/SW2022/C00_cube_10mm/model.SLDPRT';
  if(!fs.existsSync(f)){T('cube: file present',false);}
  else{
    const d=S.parse(f);let okAll=d.faces.length===6;
    for(const face of d.faces){const r=runBoth(face);const col=[...new Set(r.fn.loops?r.fn.loops[0].ids:[])];
      okAll=okAll&&r.s.ok&&r.fn.ok&&r.s.loops.length===1&&r.fn.loops.length===1&&col.length===4&&L.loopSet(r.s.loops)===L.loopSet(r.fn.loops.map(l=>l.verts));}
    T('real cube: 6 faces, simple = fan, 1 loop with 4 edge ids each',okAll);
  }
}
// ---- 6 deliberately broken faces (every check below must FLAG)
{
  const {verts,tris}=grid(6,new Set(['2,2','3,2','2,3','3,3']));let n=0;const ids=new Map();
  const idOf=boundaryIds(verts,tris,p=>{if(!ids.has(p))ids.set(p,++n);return ids.get(p);});
  const good=mk(verts,tris,idOf);
  const goodSet=L.loopSet(L.fan(L.prep(good)).loops.map(l=>l.verts));
  const flagged=(face)=>{const P=L.prep(face),s=L.simple(P),fn=L.fan(P);return {simpleBad:!s.ok,fanBad:!fn.ok,fanDiffers:fn.ok&&L.loopSet(fn.loops.map(l=>l.verts))!==goodSet,issues:fn.issues};};
  // (a) delete an interior triangle pair-edge: remove one triangle from the grid (creates a hole whose edges carry id 0)
  { const t2=tris.slice();t2.splice(0,1);const f=mk(verts,t2,idOf);const r=flagged(f);
    T('broken: a triangle missing (id-0 crack)',r.fanBad||r.fanDiffers||r.simpleBad,'simple '+(r.simpleBad?'flags':'blind')+', fan '+(r.fanBad?'flags: '+r.issues.join(';'):'ok'));}
  { const t2=tris.slice();const mid=tris.findIndex(t=>t.every(i=>verts[i][0]>0&&verts[i][0]<6&&verts[i][1]>0&&verts[i][1]<6&&!(verts[i][0]>=2&&verts[i][0]<=4&&verts[i][1]>=2&&verts[i][1]<=4)));
    t2.splice(mid,1);const f=mk(verts,t2,idOf);const r=flagged(f);
    T('broken: an interior triangle missing (simple rule is blind, fan must flag)',r.fanBad&&!r.simpleBad,'simple '+(r.simpleBad?'flags':'blind')+', fan: '+r.issues.join(';'));}
  // (b) zero one boundary id
  { const f=mk(verts,tris,(a,b)=>{const v=idOf(a,b);return v===1?0:v;});const r=flagged(f);
    T('broken: one boundary segment loses its id',r.simpleBad&&r.fanBad,'fan: '+r.issues.join(';'));}
  // (c) spurious cut: a nonzero id on one interior edge
  { const target=L.pk(K([1,1,0]),K([2,2,0]));const f=mk(verts,tris,(a,b)=>L.pk(a,b)===target?77:idOf(a,b));const r=flagged(f);
    T('broken: spurious cut on an interior edge (loops must differ from known)',r.simpleBad&&(r.fanBad||r.fanDiffers),'simple '+(r.simpleBad?'flags':'blind')+', fan '+(r.fanBad?'flags':'differs'));}
  // (d) a stray triangle glued on a boundary edge twice (edge on 3 triangles)
  { const t2=tris.concat([[tris[0][0],tris[0][1],verts.length]]);const v2=verts.concat([[0.5,-1,0]]);const t3=t2.concat([[tris[0][0],tris[0][1],verts.length+1]]);const v3=v2.concat([[0.5,-2,0]]);
    const f=mk(v3,t3,idOf);const r=flagged(f);T('broken: an edge shared by three triangles',r.fanBad,'fan: '+r.issues.join(';'));}
  // (e) the unbroken face must still pass
  { const r=flagged(good);T('unbroken twin passes',!r.simpleBad&&!r.fanBad&&!r.fanDiffers);}
}
// ---- 7 broken real face: take the first modern face of ReducerBox that needs the fan walk, drop one all-id-0 triangle
{
  const f='/home/user/sldprt-research-dump/test files online/2022/073482d3_ReducerBox_1_Reducer.SLDPRT';
  const d=S.parse(f);let done=false;
  for(const face of d.faces){const P=L.prep(face);if(L.simple(P).ok)continue;const base=L.fan(P);if(!base.ok)continue;
    const ok=L.loopSet(base.loops.map(l=>l.verts));
    // find an interior triangle: all three edges not cut
    let t=-1;for(let k=0;k<P.tris.length;k++)if(P.tris[k].every((x,j)=>!P.seg.has(L.pk(x,P.tris[k][(j+1)%3])))){t=k;break;}
    if(t<0)continue;
    const idx=Array.from(face.triangleIndices);idx.splice(3*t,3);
    const broken={vertices:face.vertices,triangleIndices:Uint32Array.from(idx),edgeAnnotations:face.edgeAnnotations};
    const Pb=L.prep(broken),fb=L.fan(Pb);
    T('broken real face (ReducerBox, interior triangle removed): fan flags',!fb.ok,fb.issues&&fb.issues.join(';'));
    T('same real face unbroken passes',base.ok&&base.eachSideOnce);
    done=true;break;}
  if(!done)T('broken real face found',false);
}
console.log('controls pass',pass,'fail',fail);
