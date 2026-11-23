'use strict';
// usage: node scan.js file [thr=1e-9]  -> per-face + total summary lines (JSON on last line)
const L=require('./lib');const file=process.argv[2],THR=+(process.argv[3]||1e-9);
const {d,M,j}=L.load(file);
const key=(f,i)=>L.V(f,i).join(',');
// coordinate -> set of display faces
const owner=new Map();
d.faces.forEach((f,fi)=>{for(let i=0;i<f.vertexCount;i++){const k=key(f,i);if(!owner.has(k))owner.set(k,new Set());owner.get(k).add(fi);}});
const others=M.faces.filter(f=>['plane','cylinder','cone'].includes(f.surface.type));
const T={faces:0,verts:0,off:0,offBoundary:0,offInterior:0,offShared:0,offUnshared:0,offChord:0,offChordLoose:0,offNotChord:0,offOnOtherSurface:0,okBoundary:0,okInterior:0,okBoundaryChord:0,okBoundaryShared:0,maxOff:0};
const rows=[];
d.faces.forEach((df,fi)=>{const nf=j[fi].face;if(!nf||!['cylinder','cone'].includes(nf.surface.type))return;
  T.faces++;const s=nf.surface;
  const bset=new Set(),segs=[];
  for(const e of df.edgeAnnotations)if(e.id!==0){bset.add(e.vertices[0]);bset.add(e.vertices[1]);segs.push(e.vertices);}
  // dedupe by coordinates not needed
  const bl=[...bset];
  const row={fi,type:s.type,rawId:df.metadata.rawId,nv:df.vertexCount,nb:bl.length,off:0,offB:0,offI:0,offShared:0,offChord:0,maxOff:0,other:0};
  for(let i=0;i<df.vertexCount;i++){
    const p=L.V(df,i),r=Math.abs(L.dSurf(s,p));T.verts++;
    const isB=bset.has(i),shared=[...owner.get(key(df,i))].some(x=>x!==fi);
    // chord tests
    let chordStrict=Infinity,chordLoose=Infinity;
    if(isB||true){
      for(const [a,b] of segs){if(a===i||b===i)continue;const pa=L.V(df,a),pb=L.V(df,b);
        if(pa.join()===p.join()||pb.join()===p.join())continue;
        chordStrict=Math.min(chordStrict,L.segDist(p,pa,pb));}
      // loose: any two boundary vertices
      for(let x=0;x<bl.length;x++)for(let y=x+1;y<bl.length;y++){if(bl[x]===i||bl[y]===i)continue;
        const pa=L.V(df,bl[x]),pb=L.V(df,bl[y]);if(pa.join()===p.join()||pb.join()===p.join())continue;
        const dd=L.segDist(p,pa,pb);if(dd<chordLoose)chordLoose=dd;}
    }
    if(r>THR){
      T.off++;row.off++;T.maxOff=Math.max(T.maxOff,r);row.maxOff=Math.max(row.maxOff,r);
      if(isB){T.offBoundary++;row.offB++}else{T.offInterior++;row.offI++}
      if(shared){T.offShared++;row.offShared++}else T.offUnshared++;
      if(chordStrict<=1e-7)T.offChord++,row.offChord++;
      if(chordLoose<=1e-7)T.offChordLoose++;
      if(!(chordStrict<=1e-7))T.offNotChord++;
      // lies on another native face's surface (not own)?
      let onO=false;for(const o of others){if(o===nf)continue;if(Math.abs(L.dSurf(o.surface,p))<1e-7){onO=true;break;}}
      if(onO){T.offOnOtherSurface++;row.other++}
    }else{
      if(isB){T.okBoundary++;if(chordStrict<=1e-7)T.okBoundaryChord++;if(shared)T.okBoundaryShared++;}else T.okInterior++;
    }
  }
  rows.push(row);
});
for(const r of rows)if(r.off)console.log(JSON.stringify(r));
console.log('TOTAL '+JSON.stringify({file,THR,...T}));
